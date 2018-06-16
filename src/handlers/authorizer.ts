import { FunctionArg, FunctionExecution } from "../core/builder";
import { unauthorizedError } from "../core/errors";
import { UnoContext, UnoEvent } from "../core/schemas";

export type AuthorizerBearerFunc<TServices> =
  (arg: {
    apiGatewayArn: string,
    apiGatewayStage: string,
    context: UnoContext,
    bearerToken: string,
    event: UnoEvent,
    services: TServices,
   }) => Promise<any>;

export const authorizerBearer = <TServices = any>(func: AuthorizerBearerFunc<TServices>)
  : FunctionExecution<UnoEvent, TServices> => {
    return async (arg: FunctionArg<UnoEvent, TServices>) => {
      const bearerToken = arg.event.original.authorizationToken
        ? arg.event.original.authorizationToken.replace(/\s*bearer\s*/ig, "")
        : undefined;

      if (!bearerToken) {
        throw unauthorizedError("Authorization header", "Missing bearer token");
      }

      const splitMethodArn = arg.event.original.methodArn.split("/");

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
