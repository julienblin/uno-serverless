import * as awsLambda from "aws-lambda";
import * as HttpStatusCodes from "http-status-codes";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { checkHealth, HealthCheckRun, HealthCheckStatus } from "../services/health-check";

export type HealthFunc<TEvent, TServices> =
  (arg: {
    context: awsLambda.Context,
    event: TEvent,
    services: TServices,
  }) => Promise<HealthCheckRun[]>;

/**
 * Determine if result is an APIGatewayProxyEvent.
 */
export const isAPIGatewayProxyEvent = (value: any): value is awsLambda.APIGatewayProxyEvent =>
  (typeof value === "object" && typeof value !== "string" && "httpMethod" in value);

/**
 * This handlers runs the health checks provided.
 */
export const health = <TEvent = any, TServices = any>(name: string, func: HealthFunc<TEvent, TServices>)
  : LambdaExecution<TEvent, TServices> => {
  return async (arg: LambdaArg<TEvent, TServices>) => {
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

    if (isAPIGatewayProxyEvent(arg.event)) {
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
