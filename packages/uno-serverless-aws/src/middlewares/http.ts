import { FunctionArg, FunctionExecution, HttpUnoEvent, Middleware, unauthorizedError } from "uno-serverless";

/**
 * This middleware exposes the requestContext.authorizer as the event principal.
 */
export const principalFromRequestAuthorizer = (throwIfUnauthorized = true)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    arg.event.principal = async () => {
      if (!arg.event.original.requestContext.authorizer) {
        if (throwIfUnauthorized) {
          throw unauthorizedError("authorizer", "No authorizer info found on request context.");
        }

        return undefined;
      }

      return arg.event.original.requestContext.authorizer;
    };

    return next(arg);
  };
};
