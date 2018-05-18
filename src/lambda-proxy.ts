// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { parse as parseQS } from "querystring";
import { defaultConfidentialityReplacer } from "../dist/utils";
import { InternalServerError } from "./errors";
import { isAPIGatewayProxyResultProvider, OKResult } from "./results";

export interface LambdaProxyFunctionArgs {
  context: lambda.Context;
  event: lambda.APIGatewayEvent;
  formBody<T>(): T | undefined;
  jsonBody<T>(): T | undefined;
}

export type LambdaProxyFunction =
  (args: LambdaProxyFunctionArgs) => Promise<object | undefined>;

export interface LambdaProxyError {
  context: lambda.Context;
  // tslint:disable-next-line:no-any
  error: any;
  event: lambda.APIGatewayEvent;
  result?: lambda.APIGatewayProxyResult;
}

export interface LambdaProxyOptions {
  /**
   * If true, adds Access-Control-Allow-Origin: * to the response headers
   * If a string, set the Access-Control-Allow-Origin to the string value.
   */
  cors?: boolean | string;

  /**
   * The custom error logger to use.
   * If not provided, will use console.log.
   */
  errorLogger?(lambdaProxyError: LambdaProxyError): void | Promise<void>;
}

const defaultErrorLogger = async (lambdaProxyError: LambdaProxyError) => {

  let parsedBody;

  if (lambdaProxyError.event.body) {
    try {
      parsedBody = JSON.parse(lambdaProxyError.event.body);
    } catch (parseError) {
      try {
        parsedBody = parseQS(lambdaProxyError.event.body);
      } catch (error) {
        console.error(error);
      }
    }
  }

  const payload = {
    error: lambdaProxyError.error,
    headers: lambdaProxyError.event.headers,
    httpMethod: lambdaProxyError.event.httpMethod,
    parsedBody,
    path: lambdaProxyError.event.path,
    requestContext: lambdaProxyError.event.requestContext,
    response: lambdaProxyError.result,
  };

  console.error(JSON.stringify(payload, defaultConfidentialityReplacer));
};

/**
 * Creates a wrapper for a Lambda function bound to API Gateway using PROXY.
 * @param func - The function to wrap.
 * @param options - various options.
 */
export const lambdaProxy =
  (func: LambdaProxyFunction, options: LambdaProxyOptions = {}): lambda.APIGatewayProxyHandler =>
    async (event: lambda.APIGatewayEvent, context: lambda.Context, callback: lambda.ProxyCallback)
      : Promise<lambda.APIGatewayProxyResult> => {

      let proxyResult: lambda.APIGatewayProxyResult | undefined;

      try {
        const funcResult = await func({
          context,
          event,
          formBody: <T>() =>
            event.body
              ? parseQS<T>(event.body)
              : undefined,
          jsonBody: <T>() =>
            event.body
              ? JSON.parse(event.body) as T
              : undefined,
        });

        proxyResult = funcResult && isAPIGatewayProxyResultProvider(funcResult)
          ? funcResult.getAPIGatewayProxyResult()
          : new OKResult(funcResult).getAPIGatewayProxyResult();

      } catch (error) {
        // tslint:disable:no-unsafe-any
        proxyResult = isAPIGatewayProxyResultProvider(error)
          ? error.getAPIGatewayProxyResult()
          : new InternalServerError(error.message ? error.message : error.toString()).getAPIGatewayProxyResult();
        // tslint:enable:no-unsafe-any

        if (!options.errorLogger) {
          options.errorLogger = defaultErrorLogger;
        }

        try {
          const loggerPromise = options.errorLogger({ event, context, error, result: proxyResult });
          if (loggerPromise) {
            await loggerPromise;
          }
        } catch (loggerError) {
          console.error(loggerError);
        }
      }

      if (!proxyResult) {
        throw new Error("Internal error in createLambdaProxy - proxyResult should not be null.");
      }

      if (options.cors) {
        proxyResult.headers = {
          ...proxyResult.headers,
          "Access-Control-Allow-Origin": typeof(options.cors) === "string" ? options.cors : "*",
        };
      }

      return proxyResult;
    };
