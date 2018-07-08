import { FunctionArg, FunctionExecution, HttpUnoEvent, Middleware, unauthorizedError } from "uno-serverless";

/**
 * This middleware exposes the requestContext.authorizer as the event principal.
 */
export const principalFromRequestAuthorizer = ()
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    const previousPrincipal = arg.event.principal;
    arg.event.principal = async (throwIfEmpty = true) => {
      if (previousPrincipal) {
        const previousPrincipalResult = await previousPrincipal(false);
        if (previousPrincipalResult) {
          return previousPrincipalResult;
        }
      }

      if (!arg.event.original.requestContext.authorizer) {
        if (throwIfEmpty) {
          throw unauthorizedError("authorizer", "No authorizer info found on request context.");
        }

        return undefined;
      }

      return arg.event.original.requestContext.authorizer;
    };

    return next(arg);
  };
};
