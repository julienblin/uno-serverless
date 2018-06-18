
export interface AzureFunctionsContext {
  invocationId: string;
  bindingData: any;
  bindings: any;

  log(text: any): void;

  done(err?: any, output?: any): void;
}

export interface AzureFunctionsHttpEvent {
  body: any;
  headers: Record<string, string>;
  method: "OPTIONS" | "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "TRACE" | "CONNECT" | "PATCH" | string;
  originalUrl: string;
  params: Record<string, string>;
  query: Record<string, string>;
  rawBody: any;
}

export interface AzureFunctionsHttpResponse {
  body?: string;
  headers?: Record<string, string>;
  isRaw?: boolean;
  status: number;
}
