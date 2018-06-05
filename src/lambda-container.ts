import { Context } from "aws-lambda";
import { RootContainer } from "./container";

/** Adds a container factory methods to options. */
export interface ContainerFactoryOptions<TEvent, TContainerContract> {
  containerFactory(
    args: { context: Context; event: TEvent }): RootContainer<TContainerContract>;
}

/** Functions arguments for containers. */
export type ContainerFunction<TArgs, TContainerContract, TReturn> =
  (args: TArgs, container: TContainerContract) => TReturn;
