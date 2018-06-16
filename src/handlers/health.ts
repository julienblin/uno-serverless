import * as HttpStatusCodes from "http-status-codes";
import { UnoContext, UnoEvent } from "../core/schemas";
import { FunctionArg, FunctionExecution } from "../core/uno";
import { checkHealth, HealthCheckRun, HealthCheckStatus } from "../services/health-check";

export type HealthFunc<TServices> =
  (arg: {
    context: UnoContext,
    event: UnoEvent,
    services: TServices,
  }) => Promise<HealthCheckRun[]>;

/**
 * This handlers runs the health checks provided.
 */
export const health = <TServices = any>(name: string, func: HealthFunc<TServices>)
  : FunctionExecution<UnoEvent, TServices> => {
  return async (arg: FunctionArg<UnoEvent, TServices>) => {
    let result;
    try {
      const runs = await func(arg);
      result = await checkHealth(name, undefined, runs);
    } catch (error) {
      result = {
        error,
        message: "Error while running the health checks.",
        name,
        status: HealthCheckStatus.Error,
      };
    }

    if (arg.event.eventType === "http") {
      switch (result.status) {
        case HealthCheckStatus.Ok:
        case HealthCheckStatus.Inconclusive:
          return {
            body: result,
            statusCode: HttpStatusCodes.OK,
          };
        case HealthCheckStatus.Warning:
          return {
            body: result,
            statusCode: HttpStatusCodes.BAD_REQUEST,
          };
        case HealthCheckStatus.Error:
          return {
            body: result,
            statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
          };
      }
    }

    return result;
  };
};
