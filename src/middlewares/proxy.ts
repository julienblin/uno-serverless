import { LambdaArg, LambdaExecution, Middleware } from "@src/builder";
import * as awsLambda from "aws-lambda";

/**
 * Determine if result is an APIGatewayProxyResult.
 */
export const isAPIGatewayProxyResult = (result: object): result is awsLambda.APIGatewayProxyResult =>
  ("statusCode" in result && "body" in result);

export type HeaderProducer<TEvent, TServices> =
  string | ((arg: LambdaArg<TEvent, TServices>, result: any) => Promise<string>);

/**
 * This middleware injects headers into the response if the result is an APIGatewayProxyResult.
 * It does nothing if the result is not an APIGatewayProxyResult.
 */
export const responseHeaders = <TEvent, TServices>(headers: Record<string, HeaderProducer<TEvent, TServices>>)
  : Middleware<TEvent, TServices> => {
  return async (arg: LambdaArg<TEvent, TServices>, next: LambdaExecution<TEvent, TServices>): Promise<any> => {
    const result = await next(arg);

    if (isAPIGatewayProxyResult(result)) {
      const finalHeaders: Record<string, string> = {};
      for (const headerKey in headers) {
        if (typeof headers[headerKey] === "string") {
          finalHeaders[headerKey] = headers[headerKey] as string;
        } else {
          const funcHeader = headers[headerKey] as (arg: LambdaArg<TEvent, TServices>, result: any) => Promise<string>;
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
