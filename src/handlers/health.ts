import * as awsLambda from "aws-lambda";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { checkHealth, HealthCheckRun, HealthCheckStatus } from "../services/health-check";

export type HealthFunc<TEvent, TServices> =
  (arg: {
    context: awsLambda.Context,
    event: TEvent,
    services: TServices,
   }) => Promise<HealthCheckRun[]>;

/**
 * This handlers runs the health checks provided.
 */
export const health = <TEvent = any, TServices = any>(name: string, func: HealthFunc<TEvent, TServices>)
  : LambdaExecution<TEvent, TServices> => {
    return async (arg: LambdaArg<TEvent, TServices>) => {
      try {
        const runs = await func(arg);
        return await checkHealth(name, undefined, runs);
      } catch (error) {
        return ({
          error,
          message: "Error while running the health checks.",
          name,
          status: HealthCheckStatus.Error,
        });
      }
    };
};
