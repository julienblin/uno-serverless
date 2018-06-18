import {
  GenericFunctionBuilder, HttpUnoEvent,
  HttpUnoResponse, ProviderAdapter, UnoContext, UnoEvent } from "uno-serverless";
import { AzureFunctionsContext, AzureFunctionsHttpEvent, AzureFunctionsHttpResponse } from "./azure-functions-schemas";

export const azureFunctionAdapter = (): ProviderAdapter => {
  return () => {
    return new GenericFunctionBuilder((outerCircle) => {
      return async (context: AzureFunctionsContext, event: any) => {
        try {
          const unoContext: UnoContext = {
            invocationId: context.invocationId,
            log: context.log,
            original: context,
            provider: "AzureFunctions",
          };

          let adapterEvent: UnoEvent | undefined;

          if (typeof event === "object" && typeof event !== "string" && "method" in event) {
            const azHttpEvent = event as AzureFunctionsHttpEvent;
            const httpUnoEvent: HttpUnoEvent = {
              body: () => azHttpEvent.body,
              headers: azHttpEvent.headers || {},
              httpMethod: azHttpEvent.method.toLowerCase(),
              original: azHttpEvent,
              parameters: {
                ...azHttpEvent.query,
                ...azHttpEvent.params,
              },
              rawBody: azHttpEvent.rawBody,
              unoEventType: "http",
              url: azHttpEvent.originalUrl,
            };

            adapterEvent = httpUnoEvent;
          }

          if (!adapterEvent) {
            adapterEvent = {
              ...event,
              unoEventType: "any",
            };
          }

          const result = await outerCircle({ event: adapterEvent, context: unoContext, services: {} });

          switch (adapterEvent!.unoEventType) {
            case "http":
              const httpUnoResponse = result as HttpUnoResponse;
              let output: AzureFunctionsHttpResponse | undefined;

              if (!result.body) {
                output = {
                  headers: result.headers,
                  status: result.statusCode,
                };
              }

              if (typeof result.body === "string") {
                output = {
                  body: result.body,
                  headers: result.headers,
                  isRaw: true,
                  status: result.statusCode,
                };
              }

              if (Buffer.isBuffer(result.body)) {
                output = {
                  body: result.body.toString("base64"),
                  headers: result.headers,
                  isRaw: true,
                  status: result.statusCode,
                };
              }

              if (!output) {
                // Last resort - we rely on Azure Functions native serialization.
                output = {
                  body: result.body,
                  headers: result.headers,
                  status: result.statusCode,
                };
              }

              context.done(undefined, output);
              break;
            default:
              context.done(undefined, result);
              break;
          }

        } catch (error) {
          context.done(error);
        }
      };
    });
  };
};
