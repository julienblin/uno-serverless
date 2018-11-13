import * as awsLambda from "aws-lambda";
import { FunctionArg, FunctionExecution, unauthorizedError, UnoContext, UnoEvent } from "uno-serverless";

export type AuthorizerBearerFunc<TServices> =
  (arg: {
    apiGatewayArn: string,
    apiGatewayStage: string,
    context: UnoContext,
    bearerToken: string,
    event: awsLambda.CustomAuthorizerEvent & UnoEvent,
    services: TServices,
  }) => Promise<awsLambda.CustomAuthorizerResult>;

export const authorizerBearer = <TServices = any>(
  func: AuthorizerBearerFunc<TServices>,
  onError?: (error) => any)
  : FunctionExecution<awsLambda.CustomAuthorizerEvent & UnoEvent, TServices> => {
  return async (arg: FunctionArg<awsLambda.CustomAuthorizerEvent & UnoEvent, TServices>) => {
    try {
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
    } catch (error) {
      if (onError) {
        return onError(error);
      }
      // tslint:disable-next-line:no-console
      console.error(error);
      // tslint:disable-next-line:no-string-throw
      throw "Unauthorized";
    }
  };
};
