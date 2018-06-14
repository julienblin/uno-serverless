import { LambdaArg, LambdaExecution, Middleware } from "../core/builder";

/**
 * This middleware allows bypassing the execution of the rest of the pipeline
 * if it evaluates positively.
 * Useful for warm-up events, for example.
 */
export const bypass = <TEvent, TServices>(
  shouldBypass: (arg: LambdaArg<TEvent, TServices>) => boolean,
  executeWhenBypass?: (arg: LambdaArg<TEvent, TServices>) => Promise<any>)
  : Middleware<TEvent, TServices> => {
    return (arg: LambdaArg<TEvent, TServices>, next: LambdaExecution<TEvent, TServices>): Promise<any> => {
      if (shouldBypass(arg)) {
        if (executeWhenBypass) {
          return executeWhenBypass(arg);
        }

        return Promise.resolve();
      }

      return next(arg);
    };
};
