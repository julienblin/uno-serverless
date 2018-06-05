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
 * Result class that implements {APIGatewayProxyResultProvider}.
 */
export class Result implements APIGatewayProxyResultProvider {

  public constructor(public readonly statusCode: number, public readonly body?: {}, public readonly headers?: Headers) {
  }

  /**
   * Converts to {APIGatewayProxyResult}
   */
  public getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult {
    return {
      body: serializer(this.body),
      headers: this.headers,
      statusCode: this.statusCode,
    };
  }
}

export const result = (statusCode: number, body?: {}, headers?: Headers) =>
  new Result(statusCode, body, headers);

/**
 * Response with OK - 200 or No Content - 204 if body is not true.
 */
export const ok = (body?: {}, headers?: Headers) =>
  result(body ? HttpStatusCodes.OK : HttpStatusCodes.NO_CONTENT, body, headers);

/**
 * Response with 201 created
 */
export const created = (location: string, body?: {}, headers?: Headers) =>
  result(HttpStatusCodes.CREATED, body, {...headers, Location: location });

/**
 * Represents a 202 result.
 */
export const accepted = (body?: {}, headers?: Headers) =>
  result(HttpStatusCodes.ACCEPTED, body, headers);

/**
 * Represents a redirect, either temporary (303 - See Other default)
 * or permanent (301).
 */
export const redirect = (location: string, permanent = false, headers?: Headers) =>
  result(
      permanent ? HttpStatusCodes.MOVED_PERMANENTLY : HttpStatusCodes.SEE_OTHER,
      {},
      {...headers, Location: location });

/** Represents a binary result with a 200 status code.. */
export class BinaryResult implements APIGatewayProxyResultProvider {
  public constructor(public data: Buffer, public contentType: string, public headers?: Headers) {
  }

  /**
   * Converts to {APIGatewayProxyResult}
   */
  public getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult {
    return {
      body: this.data.toString("base64"),
      headers: {
        ...this.headers,
        "Content-Type": this.contentType,
      },
      isBase64Encoded: true,
      statusCode: HttpStatusCodes.OK,
    };
  }
}

/**
 * Returns {data} as base64 binary result with {contentType} and 200 status code.
 */
export const binary = (data: Buffer, contentType = "application/octet-stream", headers?: Headers) =>
  new BinaryResult(data, contentType, headers);
