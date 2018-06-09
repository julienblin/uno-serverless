import * as awsLambda from "aws-lambda";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { methodNotAllowedError, notFoundError } from "../core/errors";
import { ok } from "../core/responses";
import { isAPIGatewayProxyResult, ServicesWithParseBody, ServicesWithParseParameters } from "../middlewares/proxy";

const runProxy = async <TServices>(
  func: ProxyFunc<TServices>,
  arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) => {
  const result = await func({
    context: arg.context,
    event: arg.event,
    services: arg.services as TServices & ServicesWithParseBody & ServicesWithParseParameters,
  });

  if (result && isAPIGatewayProxyResult(result)) {
    return result;
  }

  if (result) {
    return ok(result);
  } else {
    throw notFoundError(arg.event.path);
  }
};

export type ProxyFunc<TServices> =
  (arg: {
    event: awsLambda.APIGatewayProxyEvent,
    context: awsLambda.Context,
    services: TServices & ServicesWithParseBody & ServicesWithParseParameters,
  }) => Promise<any>;

/**
 * This handler is for lambda proxy integrations.
 * Allows to return any object as a result, and also passes
 * convenience methods in services for parseBody and parseParameters.
 * Throws notFoundError if result is undefined, or return ok() if result is an object.
 * If returning a APIGatewayProxyResult, just passes it back.
 */
export const proxy = <TServices = any>(func: ProxyFunc<TServices>)
  : LambdaExecution<awsLambda.APIGatewayProxyEvent, TServices> => {
  return async (arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) =>
    runProxy(func, arg);
};

export type HttpMethod = "get" | "head" | "options" | "post" | "put" | "patch" | "delete";

export type ProxyMethods<TServices> = Partial<Record<HttpMethod, ProxyFunc<TServices>>>;

/**
 * Same as proxy handler, but allow multiple handlers to be defined and segregated by event HTTP methods.
 */
export const proxyByMethod = <TServices = any>(methods: ProxyMethods<TServices>)
  : LambdaExecution<awsLambda.APIGatewayProxyEvent, TServices> => {
  return async (arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) => {

    const func = methods[arg.event.httpMethod.toLowerCase()] as ProxyFunc<TServices> | undefined;

    if (!func) {
      throw methodNotAllowedError(`Method ${arg.event.httpMethod.toLowerCase()} is not allowed.`);
    }

    return runProxy(func, arg);
  };
};
