import * as awsLambda from "aws-lambda";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { notFoundError } from "../core/errors";
import { ok } from "../core/responses";
import { isAPIGatewayProxyResult, ServicesWithParseBody, ServicesWithParseParameters } from "../middlewares/proxy";

export type ProxyFunc<TServices> =
  (
    lambda: { event: awsLambda.APIGatewayProxyEvent, context: awsLambda.Context },
    services: TServices & ServicesWithParseBody & ServicesWithParseParameters) => Promise<any>;

export const proxy = <TServices = any>(func: ProxyFunc<TServices>)
  : LambdaExecution<awsLambda.APIGatewayProxyEvent, TServices> => {
    return async (arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) => {
      const result = await func(
        { context: arg.context, event: arg.event },
        arg.services as TServices & ServicesWithParseBody & ServicesWithParseParameters);

      if (result && isAPIGatewayProxyResult(result)) {
        return result;
      }

      if (result) {
        return ok(result);
      } else {
        throw notFoundError(arg.event.path);
      }
    };
};
