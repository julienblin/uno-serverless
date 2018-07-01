import { FunctionArg, FunctionExecution, HttpUnoEvent, memoize, Middleware, unauthorizedError } from "uno-serverless";

/**
 * This middleware verify a bearer token located in the authorization header.
 */
export const principalFromBearerToken = (
  func: (arg: FunctionArg<HttpUnoEvent, any>, bearerToken: string) => any,
  throwIfUnauthorized = true)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    arg.event.principal = memoize(async () => {
      const bearerToken = arg.event.headers.authorization
        ? arg.event.headers.authorization.replace(/\s*bearer\s*/ig, "")
        : undefined;

      if (!bearerToken) {
        if (throwIfUnauthorized) {
          throw unauthorizedError("authorization header", "No authorization header found.");
        }

        return undefined;
      }

      return func(arg, bearerToken);
    });

    return next(arg);
  };
};
