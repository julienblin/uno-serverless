import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";
import { defaultConfidentialityReplacer, safeJSONStringify } from "../core/utils";

export const contextErrorLog = (arg: FunctionArg<any, any>, message?: string) => {
  if (message) {
    arg.context.log(message);
  }
};

/**
 * This middleware logs errors & event/context before re-throwing them as-is.
 */
export const errorLogging = (errorFunc: (arg: FunctionArg<any, any>, message?: string) => void = contextErrorLog)
  : Middleware<any, any> => {
    return async (arg: FunctionArg<any, any>, next: FunctionExecution<any, any>): Promise<any> => {
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

        errorFunc(arg, safeJSONStringify(payload, defaultConfidentialityReplacer, 2));
        throw error;
      }
    };
};
