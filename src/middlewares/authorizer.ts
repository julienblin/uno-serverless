import * as awsLambda from "aws-lambda";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { unauthorizedError } from "../core/errors";

export type AuthorizerBearerFunc<TServices> =
  (arg: {
    apiGatewayArn: string,
    apiGatewayStage: string,
    context: awsLambda.Context,
    bearerToken: string,
    event: awsLambda.CustomAuthorizerEvent,
    services: TServices,
   }) => Promise<awsLambda.CustomAuthorizerResult>;

export const authorizerBearer = <TServices = any>(func: AuthorizerBearerFunc<TServices>)
  : LambdaExecution<awsLambda.CustomAuthorizerEvent, TServices> => {
    return async (arg: LambdaArg<awsLambda.CustomAuthorizerEvent, TServices>) => {

      const bearerToken = arg.event.authorizationToken
        ? arg.event.authorizationToken.replace(/\s*bearer\s*/ig, "")
        : undefined;

      if (!bearerToken) {
        throw unauthorizedError("Authorization header", "Missing bearer token");
      }

      const splitMethodArn = arg.event.methodArn.split("/");

      return func({
        apiGatewayArn: `${splitMethodArn[0]}/${splitMethodArn[1]}`,
        apiGatewayStage: splitMethodArn[1],
        bearerToken,
        context: arg.context,
        event: arg.event,
        services: arg.services,
        });
    };
};
