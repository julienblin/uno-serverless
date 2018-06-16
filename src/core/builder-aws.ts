import { GenericFunctionBuilder, ProviderAdapter } from "./builder";
import { HttpUnoEvent, isHttpUnoResponse, UnoContext, UnoEvent } from "./schemas";

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

        const unoEvent: UnoEvent = {
          eventType: "any",
          original: event,
        };

        if (typeof event === "object" && typeof event !== "string" && "httpMethod" in event) {
          unoEvent.eventType = "http";
          const unoHttpEvent = unoEvent as HttpUnoEvent;
          unoHttpEvent.body = event.body;
          unoHttpEvent.headers = event.headers || {};
          unoHttpEvent.httpMethod = event.httpMethod.toLowerCase(),
          unoHttpEvent.parameters = {
            ...event.queryStringParameters,
            ...event.pathParameters,
          };
          unoHttpEvent.url = event.path;
        }

        const result = await outerCircle({ event: unoEvent, context: unoContext, services: {} });

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
