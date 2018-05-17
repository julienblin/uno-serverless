// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { InternalServerError } from "./errors";
import { isAPIGatewayProxyResultProvider, OKResult } from "./results";

export type LambdaProxyExecution = () => Promise<object | undefined>;

export interface LambdaProxyOptions {
  /**
   * If true, adds Access-Control-Allow-Origin: * to the response headers
   * If a string, set the Access-Control-Allow-Origin to the string value.
   */
  cors?: boolean | string;

  /** When returning raw object, will respond with 404/NotFoundError instead of 204 No content */
  falsyObjectsReturnNotFound?: boolean;
}

export const createLambdaProxy =
  (func: LambdaProxyExecution, options: LambdaProxyOptions = {}): lambda.APIGatewayProxyHandler =>
    async (event: lambda.APIGatewayEvent, context: lambda.Context, callback: lambda.ProxyCallback)
      : Promise<lambda.APIGatewayProxyResult> => {

      let proxyResult: lambda.APIGatewayProxyResult | undefined;

      try {
        const funcResult = await func();

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

      return proxyResult;
    };
