import { LambdaArg, LambdaExecution, Middleware } from "../core/builder";
import { RootContainer } from "../core/container";
import { supportDestructuring } from "../core/utils";

export type ContainerInitialization<TEvent, TServices> =
  (arg: LambdaArg<TEvent, TServices>) => RootContainer<TServices>;

/**
 * This middleware creates and maintains a singleton root container,
 * and inject scoped container in the args.services.
 * @param containerInitialization - The initialization to build the root container on first execution.
 */
export const container = <TEvent, TServices>(containerInitialization: ContainerInitialization<TEvent, TServices>)
  : Middleware<TEvent, TServices> => {
    let rootContainer: RootContainer<TServices> | undefined;
    return (arg: LambdaArg<TEvent, TServices>, next: LambdaExecution<TEvent, TServices>): Promise<any> => {
      if (!rootContainer) {
        rootContainer = containerInitialization(arg);
      }

      arg.services = supportDestructuring(rootContainer.scope());

      return next(arg);
    };
};
