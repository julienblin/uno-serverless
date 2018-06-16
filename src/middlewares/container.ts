import { RootContainer } from "../core/container";
import { UnoEvent } from "../core/schemas";
import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";
import { supportDestructuring } from "../core/utils";

export type ContainerInitialization<TEvent extends UnoEvent, TServices> =
  (arg: FunctionArg<TEvent, TServices>) => RootContainer<TServices>;

/**
 * This middleware creates and maintains a singleton root container,
 * and inject scoped container in the args.services.
 * @param containerInitialization - The initialization to build the root container on first execution.
 */
export const container = <TEvent extends UnoEvent, TServices>(
  containerInitialization: ContainerInitialization<TEvent, TServices>)
  : Middleware<TEvent, TServices> => {
    let rootContainer: RootContainer<TServices> | undefined;
    return (arg: FunctionArg<TEvent, TServices>, next: FunctionExecution<TEvent, TServices>): Promise<any> => {
      if (!rootContainer) {
        rootContainer = containerInitialization(arg);
      }

      arg.services = supportDestructuring(rootContainer.scope());

      return next(arg);
    };
};
