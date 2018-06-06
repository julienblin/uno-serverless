import * as HttpStatusCodes from "http-status-codes";

export type Headers = Record<string, boolean | number | string>;

export interface NonSerializedAPIGatewayResult {
  body?: {};
  headers?: Headers;
  isBase64Encoded?: boolean;
  statusCode: number;
}

export const ok = (body?: {}, headers?: Headers): NonSerializedAPIGatewayResult => ({
  body,
  headers,
  statusCode: body ? HttpStatusCodes.OK : HttpStatusCodes.NO_CONTENT,
});
