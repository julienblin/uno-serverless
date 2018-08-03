import {
  ConfigService, container as containerMiddleware, createContainerFactory,
  defaultHttpMiddlewares, errorLogging, ProcessEnvConfigService, uno,
} from "uno-serverless";
import { awsLambdaAdapter } from "uno-serverless-aws";

/** The specification for the container. */
export interface Container {
  configService(): ConfigService;
}

/** Options for container creation. */
export interface ContainerOptions {
  stage: string;
}

/** Definition of factories for the container. */
export const createContainer = createContainerFactory<Container, ContainerOptions>({
  configService: () => new ProcessEnvConfigService(),
});

export const httpFunc = () => uno(awsLambdaAdapter())
  .use(containerMiddleware(() => createContainer()))
  .use(defaultHttpMiddlewares());

export const func = () => uno(awsLambdaAdapter())
  .use(containerMiddleware(() => createContainer()))
  .use(errorLogging());
