import * as awsLambda from "aws-lambda";
import { parse as parseQS } from "querystring";
import { LambdaArg, LambdaExecution, Middleware } from "../core/builder";
import { badRequestError, internalServerError, isStatusCodeProvider, notFoundError } from "../core/errors";
import { ok } from "../core/responses";
import { memoize, safeJSONStringify } from "../core/utils";
import { errorLogging } from "./logging";

/**
 * Determine if result is an APIGatewayProxyResult.
 */
export const isAPIGatewayProxyResult = (result: object): result is awsLambda.APIGatewayProxyResult =>
  (typeof result === "object" && typeof result !== "string" && "statusCode" in result && "body" in result);

export type HeaderProducer<TEvent, TServices> =
  string | ((arg: LambdaArg<TEvent, TServices>, result: any) => Promise<string>);

/**
 * This middleware injects headers into the response if the result is an APIGatewayProxyResult.
 * It does nothing if the result is not an APIGatewayProxyResult.
 */
export const responseHeaders = <TServices>
  (headers: Record<string, HeaderProducer<awsLambda.APIGatewayProxyEvent, TServices>>)
  : Middleware<awsLambda.APIGatewayProxyEvent, TServices> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>,
    next: LambdaExecution<awsLambda.APIGatewayProxyEvent, TServices>): Promise<any> => {
    const result = await next(arg);

    if (isAPIGatewayProxyResult(result)) {
      const finalHeaders: Record<string, string> = {};
      for (const headerKey in headers) {
        if (typeof headers[headerKey] === "string") {
          finalHeaders[headerKey] = headers[headerKey] as string;
        } else {
          const funcHeader = headers[headerKey] as
            (arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>, result: any) => Promise<string>;
          finalHeaders[headerKey] = await funcHeader(arg, result);
        }
      }

      result.headers = {
        ...result.headers,
        ...finalHeaders,
      };
    }

    return result;
  };
};

/**
 * This middleware adds Access-Control-Allow-Origin headers to the response.
 * @param origin the origin to use. If not specify, "*" is assumed.
 */
export const cors = (origin?: string | Promise<string>) =>
  responseHeaders({ "Access-Control-Allow-Origin": origin ? async () => origin : "*" });

/**
 * This middleware catch errors and return adapted payload.
 * If you plan to do error logging, remember to place the log after this middleware.
 */
export const httpErrors = (): Middleware<awsLambda.APIGatewayProxyEvent, any> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, any>,
    next: LambdaExecution<awsLambda.APIGatewayProxyEvent, any>): Promise<any> => {

    try {
      return await next(arg);
    } catch (error) {
      const finalError = isStatusCodeProvider(error)
        ? error
        : internalServerError(error.message) as any;

      return {
        body: {
          ...finalError,
          message: finalError.message,
        },
        statusCode: finalError.getStatusCode(),
      };
    }

  };
};

/**
 * If the body of the response is not a string, serializes the object as JSON.
 */
export const serializeBodyAsJSON =
  (options: {
    replacer?: (key: string, value: any) => any,
    space?: string | number,
    safe?: boolean,
  } = {}): Middleware<awsLambda.APIGatewayProxyEvent, any> => {
    return async (
      arg: LambdaArg<awsLambda.APIGatewayProxyEvent, any>,
      next: LambdaExecution<awsLambda.APIGatewayProxyEvent, any>): Promise<any> => {

      const result = await next(arg);

      if (!isAPIGatewayProxyResult(result)) {
        return result;
      }

      if (typeof result.body === "string") {
        return result;
      }

      return {
        ...result,
        body: options.safe
          ? safeJSONStringify(result.body, options.replacer, options.space)
          : JSON.stringify(result.body, options.replacer, options.space),
        headers: {
          ...result.headers,
          "Content-Type": "application/json",
        },
      };
    };
  };

export const BODY_METHOD = "body";

export interface ServicesWithBody {
  [BODY_METHOD]<T>(): T;
}

/**
 * This middleware exposes a method in the service object to parse the body of a request as JSON.
 */
export const parseBodyAsJSON = (reviver?: (key: any, value: any) => any, parseMethod = BODY_METHOD)
  : Middleware<awsLambda.APIGatewayProxyEvent, any> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, any>,
    next: LambdaExecution<awsLambda.APIGatewayProxyEvent, any>): Promise<any> => {

    arg.services[parseMethod] = memoize(() => {
      if (!arg.event.body) {
        return undefined;
      }

      try {
        return JSON.parse(arg.event.body, reviver);
      } catch (error) {
        throw badRequestError(error.message);
      }
    });

    return next(arg);
  };
};

/**
 * This middleware exposes a method in the service object to parse the body of a request
 * as FORM (application/x-www-form-urlencoded).
 */
export const parseBodyAsFORM = (reviver?: (key: any, value: any) => any, parseMethod = BODY_METHOD)
  : Middleware<awsLambda.APIGatewayProxyEvent, any> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, any>,
    next: LambdaExecution<awsLambda.APIGatewayProxyEvent, any>): Promise<any> => {

    arg.services[parseMethod] = memoize(() => {
      if (!arg.event.body) {
        return undefined;
      }

      try {
        return parseQS<any>(arg.event.body);
      } catch (error) {
        throw badRequestError(error.message);
      }
    });

    return next(arg);
  };
};

export const PARAMETERS_METHOD = "parameters";

export interface ServicesWithParameters {
  [PARAMETERS_METHOD]<T = any>(): T;
}

const decodeFromSource = (source: { [name: string]: string }, params: any) => {
  Object.keys(source).forEach((prop) => {
    params[prop] = decodeURIComponent(source[prop]);
  });
};

/**
 * This middleware exposes a method in the service object to regroup all the parameters
 * into a cohesive object and URL-decode them.
 */
export const parseParameters = (parseMethod = PARAMETERS_METHOD)
  : Middleware<awsLambda.APIGatewayProxyEvent, any> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, any>,
    next: LambdaExecution<awsLambda.APIGatewayProxyEvent, any>): Promise<any> => {

    arg.services[parseMethod] = memoize(() => {
      const params: any = {};

      if (arg.event && arg.event.pathParameters) {
        decodeFromSource(arg.event.pathParameters, params);
      }

      if (arg.event && arg.event.queryStringParameters) {
        decodeFromSource(arg.event.queryStringParameters, params);
      }

      return params;
    });

    return next(arg);
  };
};

/**
 * Returns the following suite of middlewares:
 * serializeBodyAsJSON, httpErrors, errorLogging, parseBodyAsJSON, parseParameters
 */
export const defaultProxyMiddlewares = () => [
  serializeBodyAsJSON(),
  httpErrors(),
  errorLogging(),
  parseBodyAsJSON(),
  parseParameters(),
];
