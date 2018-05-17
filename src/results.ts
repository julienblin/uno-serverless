// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";

type Headers = Record<string, boolean | number | string>;

/**
 * Marks a provider of {APIGatewayProxyResult}.
 */
export interface APIGatewayProxyResultProvider {

  /**
   * Converts to {APIGatewayProxyResult}
   */
  getAPIGatewayProxyResult(): APIGatewayProxyResult;
}

/**
 * Indicates whether obj is a {APIGatewayProxyResultProvider}
 */
export const isAPIGatewayProxyResultProvider = (obj: object): obj is APIGatewayProxyResultProvider =>
  "getAPIGatewayProxyResult" in obj;

/**
 * Response with OK - 200 or No Content - 204 if body is not true.
 */
export class OKResult implements APIGatewayProxyResultProvider {

  public constructor(public readonly body?: {}, public readonly headers?: Headers) {
  }

  /**
   * Converts to {APIGatewayProxyResult}
   */
  public getAPIGatewayProxyResult(): APIGatewayProxyResult {
    return {
      body: this.body ? JSON.stringify(this.body) : "",
      headers: this.headers,
      statusCode: this.body ? HttpStatusCodes.OK : HttpStatusCodes.NO_CONTENT,
    };
  }
}
