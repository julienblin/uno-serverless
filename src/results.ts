// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyResult } from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";

export type Headers = Record<string, boolean | number | string>;

export type BodySerializer = (body?: any) => string;

/**
 * Marks a provider of {APIGatewayProxyResult}.
 */
export interface APIGatewayProxyResultProvider {

  /**
   * Converts to {APIGatewayProxyResult}
   */
  getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult;
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
  public getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult {
    return {
      body: serializer(this.body),
      headers: this.headers,
      statusCode: this.body ? HttpStatusCodes.OK : HttpStatusCodes.NO_CONTENT,
    };
  }
}

/**
 * Response with OK - 200 or No Content - 204 if body is not true.
 */
export const ok = (body?: {}, headers?: Headers) => new OKResult(body, headers);
