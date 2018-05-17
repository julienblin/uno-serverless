// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { InternalServerError } from "./errors";
import { isAPIGatewayProxyResultProvider, OKResult } from "./results";

export type LambdaProxyExecution =
  (args: { context: lambda.Context; event: lambda.APIGatewayEvent }) => Promise<object | undefined>;

export interface LambdaProxyOptions {
  /**
   * If true, adds Access-Control-Allow-Origin: * to the response headers
   * If a string, set the Access-Control-Allow-Origin to the string value.
   */
  cors?: boolean | string;
}

/**
 * Creates a wrapper for a Lambda function bound to API Gateway using PROXY.
 * @param func - The function to wrap.
 * @param options - various options.
 */
export const lambdaProxy =
  (func: LambdaProxyExecution, options: LambdaProxyOptions = {}): lambda.APIGatewayProxyHandler =>
    async (event: lambda.APIGatewayEvent, context: lambda.Context, callback: lambda.ProxyCallback)
      : Promise<lambda.APIGatewayProxyResult> => {

      let proxyResult: lambda.APIGatewayProxyResult | undefined;

      try {
        const funcResult = await func({
          context,
          event,
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
