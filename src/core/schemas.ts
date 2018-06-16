
export type UnoEventType = "any" | "http";

export interface UnoEvent {
  eventType: UnoEventType;
  original: any;
}

export interface UnoContext {
  invocationId: string;
  original: any;
  provider: string;
  log(text: string);
}

export type HttpMethod = "get" | "head" | "options" | "post" | "put" | "patch" | "delete" | "trace" | "connect";

export interface HttpUnoEvent extends UnoEvent {
  headers: Record<string, string>;
  httpMethod: HttpMethod | string;
  parameters: Record<string, string>;
  rawBody: string;
  url: string;
  body<T>(): T;
}

export interface HttpUnoResponse {
  /**
   * object means that it has not been serialized yet.
   * Buffer means a binary response.
   * string means that serialization has happen.
   */
  body?: object | Buffer | string;
  headers?: Record<string, string>;
  statusCode: number;
}

/**
 * Determine if result is an HttpUnoResponse.
 */
export const isHttpUnoResponse = (value: any): value is HttpUnoResponse =>
  (typeof value === "object" && typeof value !== "string" && "statusCode" in value);
