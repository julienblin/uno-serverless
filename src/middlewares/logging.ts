import { LambdaArg, LambdaExecution, Middleware } from "../core/builder";
import { defaultConfidentialityReplacer, safeJSONStringify } from "../core/utils";

/**
 * This middleware logs errors & event/context before re-throwing them as-is.
 */
export const errorLogging = (errorFunc: (message?: any) => void = console.error)
  : Middleware<any, any> => {
    return async (arg: LambdaArg<any, any>, next: LambdaExecution<any, any>): Promise<any> => {
      try {
        return await next(arg);
      } catch (error) {
        const payload = {
          context: arg.context,
          error: {
            ...error,
            message: error.message,
          },
          errorStackTrace: error.stack,
          event: arg.event,
        };

        errorFunc(safeJSONStringify(payload, defaultConfidentialityReplacer, 2));
        throw error;
      }
    };
};
