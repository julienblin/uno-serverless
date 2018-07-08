import * as HttpStatusCode from "http-status-codes";
import {
  GenericFunctionBuilder, HttpUnoEvent,
  ProviderAdapter, UnoContext, UnoEvent } from "uno-serverless";
import { AzureFunctionsContext, AzureFunctionsHttpEvent, AzureFunctionsHttpResponse } from "./azure-functions-schemas";

const defaultPrincipal = async (throwIfEmpty = true) => {
  if (throwIfEmpty) {
    throw new Error("Unable to retrieve principal. Did you forget to add a middleware?");
  }

  return undefined;
};

export const azureFunctionAdapter = (): ProviderAdapter => {
  return () => {
    return new GenericFunctionBuilder((outerCircle) => {
      return (context: AzureFunctionsContext, event: any) => {
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
              httpMethod: azHttpEvent.method && azHttpEvent.method.toLowerCase(),
              original: azHttpEvent,
              parameters: {
                ...azHttpEvent.query,
                ...azHttpEvent.params,
              },
              principal: defaultPrincipal,
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

          outerCircle({ event: adapterEvent, context: unoContext, services: {} })
            .then((result) => {
              switch (adapterEvent!.unoEventType) {
                case "http":
                  let output: AzureFunctionsHttpResponse | undefined;

                  if (!result) {
                    output = {
                      status: HttpStatusCode.NO_CONTENT,
                    };
                  }

                  if (result && !result.body) {
                    output = {
                      headers: result.headers,
                      status: result.statusCode,
                    };
                  }

                  if (result && typeof result.body === "string") {
                    output = {
                      body: result.body,
                      headers: result.headers,
                      isRaw: true,
                      status: result.statusCode,
                    };
                  }

                  if (result && Buffer.isBuffer(result.body)) {
                    output = {
                      body: result.body.toString("base64"),
                      headers: result.headers,
                      isRaw: true,
                      status: result.statusCode,
                    };
                  }

                  if (!output && result) {
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
            })
            .catch((error) => {
              context.done(error);
            });
      };
    });
  };
};
