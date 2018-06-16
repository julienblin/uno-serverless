import { UnoEvent } from "../core/schemas";
import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";

/**
 * This middleware allows bypassing the execution of the rest of the pipeline
 * if it evaluates positively.
 * Useful for warm-up events, for example.
 */
export const bypass = <TEvent extends UnoEvent, TServices>(
  shouldBypass: (arg: FunctionArg<TEvent, TServices>) => boolean,
  executeWhenBypass?: (arg: FunctionArg<TEvent, TServices>) => Promise<any>)
  : Middleware<TEvent, TServices> => {
    return (arg: FunctionArg<TEvent, TServices>, next: FunctionExecution<TEvent, TServices>): Promise<any> => {
      if (shouldBypass(arg)) {
        if (executeWhenBypass) {
          return executeWhenBypass(arg);
        }

        return Promise.resolve();
      }

      return next(arg);
    };
};
