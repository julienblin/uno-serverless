import { FunctionArg, FunctionExecution, HttpUnoEvent, Middleware, unauthorizedError } from "uno-serverless";

/**
 * This middleware verify a bearer token located in the authorization header.
 */
export const principalFromBearerToken = (func: (arg: FunctionArg<HttpUnoEvent, any>, bearerToken: string) => any)
  : Middleware<HttpUnoEvent, any> => {

  const bearerHeaderRegex = new RegExp(/\s*Bearer\s+(.*)/i);

  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<HttpUnoEvent, any>): Promise<any> => {

    const previousPrincipal = arg.event.principal;
    let previousResult: any;
    arg.event.principal = async (throwIfEmpty = true) => {
      if (previousPrincipal) {
        const previousPrincipalResult = await previousPrincipal(false);
        if (previousPrincipalResult) {
          return previousPrincipalResult;
        }
      }

      if (previousResult) {
        return previousResult;
      }

      let bearerToken: string | undefined;
      const match = bearerHeaderRegex.exec(arg.event.headers.authorization);
      if (match) {
        bearerToken = match[1];
      }

      if (!bearerToken) {
        if (throwIfEmpty) {
          throw unauthorizedError("authorization header", "No authorization header found.");
        }

        return undefined;
      }

      previousResult = func(arg, bearerToken);
      return previousResult;
    };

    return next(arg);
  };
};
