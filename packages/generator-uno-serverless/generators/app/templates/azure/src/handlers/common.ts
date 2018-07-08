import { Config } from "@config";
import "source-map-support/register";
import {
  ConfigService, container as containerMiddleware,
  createContainerFactory, defaultHttpMiddlewares,
  errorLogging, ProcessEnvConfigService, uno } from "uno-serverless";
import { azureFunctionAdapter } from "uno-serverless-azure";

/** The specification for the container. */
export interface Container {
  configService(): ConfigService;
}

/** Definition of factories for the container. */
export const createContainer = createContainerFactory<Container>({
  configService: () => new ProcessEnvConfigService(),
});

export const httpFunc = () => uno(azureFunctionAdapter())
  .use(containerMiddleware(() => createContainer()))
  .use(defaultHttpMiddlewares());

export const func = () => uno(azureFunctionAdapter())
  .use(containerMiddleware(() => createContainer()))
  .use(errorLogging());
