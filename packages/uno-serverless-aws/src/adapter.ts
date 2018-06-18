import {
  GenericFunctionBuilder, HttpUnoEvent, isHttpUnoResponse,
  ProviderAdapter, UnoContext } from "uno-serverless";

const throwBody = () => { throw new Error("Unable to parse body. Did you forget to add a middleware?"); };
const throwPrincipal = () => { throw new Error("Unable to retrieve principal. Did you forget to add a middleware?"); };

const decodeFromSource = (params: Record<string, string>, source?: Record<string, string>) => {
  if (source) {
    Object.keys(source).forEach((prop) => {
      params[prop] = decodeURIComponent(source[prop]);
    });
  }
};

export const awsLambdaAdapter = (): ProviderAdapter => {
  return () =>  {
    return new GenericFunctionBuilder((outerCircle) => {
      return async (event: any, context: any) => {
        const unoContext: UnoContext = {
          invocationId: context.awsRequestId,
          log: console.log,
          original: context,
          provider: "AWSLambda",
        };

        let adapterEvent;

        if (typeof event === "object" && typeof event !== "string" && "httpMethod" in event) {
          const httpUnoEvent: HttpUnoEvent = {
            body: throwBody,
            headers: event.headers || {},
            httpMethod: event.httpMethod.toLowerCase(),
            original: event,
            parameters: {},
            principal: throwPrincipal,
            rawBody: event.body,
            unoEventType: "http",
            url: event.path,
          };
          decodeFromSource(httpUnoEvent.parameters, event.queryStringParameters);
          decodeFromSource(httpUnoEvent.parameters, event.pathParameters);

          adapterEvent = httpUnoEvent;
        }

        if (!adapterEvent) {
          adapterEvent = {
            ...event,
            unoEventType: "any",
          };
        }

        const result = await outerCircle({ event: adapterEvent, context: unoContext, services: {} });

        if (isHttpUnoResponse(result)) {
          if (!result.body) {
            return {
              headers: result.headers,
              statusCode: result.statusCode,
            };
          }

          if (typeof result.body === "string") {
            return {
              body: result.body,
              headers: result.headers,
              statusCode: result.statusCode,
            };
          }

          if (Buffer.isBuffer(result.body)) {
            return {
              body: result.body.toString("base64"),
              headers: result.headers,
              isBase64Encoded: true,
              statusCode: result.statusCode,
            };
          }

          // Last resort - we assume the handler wants a JSON serialization.
          return {
            body: JSON.stringify(result.body),
            headers: {
              ... result.headers,
              "Content-Type": "application/json",
            },
            statusCode: result.statusCode,
          };
        }

        return result;
      };
    });
  };
};
