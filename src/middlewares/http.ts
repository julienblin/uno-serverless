import { parse as parseQS } from "querystring";
import { badRequestError, internalServerError, isStatusCodeProvider } from "../core/errors";
import { HttpUnoResponse } from "../core/schemas";
import { HttpUnoEvent, isHttpUnoResponse, UnoEvent } from "../core/schemas";
import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";
import { safeJSONStringify } from "../core/utils";
import { errorLogging } from "./logging";

export type HeaderProducer<TEvent extends UnoEvent, TServices> =
  string | ((arg: FunctionArg<TEvent, TServices>, result: any) => Promise<string>);

/**
 * This middleware injects headers into the response if the result is an APIGatewayProxyResult.
 * It does nothing if the result is not an APIGatewayProxyResult.
 */
export const responseHeaders = <TServices>
  (headers: Record<string, HeaderProducer<HttpUnoEvent, TServices>>)
  : Middleware<HttpUnoEvent, TServices> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, TServices>,
    next: FunctionExecution<HttpUnoEvent, TServices>): Promise<any> => {
    const result = await next(arg);

    if (isHttpUnoResponse(result)) {
      const finalHeaders: Record<string, string> = {};
      for (const headerKey in headers) {
        if (typeof headers[headerKey] === "string") {
          finalHeaders[headerKey] = headers[headerKey] as string;
        } else {
          const funcHeader = headers[headerKey] as
            (arg: FunctionArg<HttpUnoEvent, TServices>, result: any) => Promise<string>;
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
export const httpErrors = (): Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<HttpUnoResponse> => {

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
  } = {}): Middleware<HttpUnoEvent, any> => {
    return async (
      arg: FunctionArg<HttpUnoEvent, any>,
      next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

      const result = await next(arg);

      if (!isHttpUnoResponse(result)) {
        return result;
      }

      if (typeof result.body === "string") {
        return result;
      }

      if (Buffer.isBuffer(result.body)) {
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

/**
 * This middleware exposes a method in the service object to parse the body of a request as JSON.
 */
export const parseBodyAsJSON = (reviver?: (key: any, value: any) => any)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    arg.event.body = () => {
      if (!arg.event.rawBody) {
        return undefined;
      }

      try {
        return JSON.parse(arg.event.rawBody, reviver);
      } catch (error) {
        throw badRequestError(error.message);
      }
    };

    return next(arg);
  };
};

/**
 * This middleware exposes a method in the service object to parse the body of a request
 * as FORM (application/x-www-form-urlencoded).
 */
export const parseBodyAsFORM = ()
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    arg.event.body = () => {
      if (!arg.event.body) {
        return undefined;
      }

      try {
        return parseQS<any>(arg.event.rawBody);
      } catch (error) {
        throw badRequestError(error.message);
      }
    };

    return next(arg);
  };
};

/**
 * Returns the following suite of middlewares:
 * serializeBodyAsJSON, httpErrors, errorLogging, parseBodyAsJSON
 */
export const defaultProxyMiddlewares = () => [
  serializeBodyAsJSON(),
  httpErrors(),
  errorLogging(),
  parseBodyAsJSON(),
];
