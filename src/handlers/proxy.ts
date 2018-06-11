import * as awsLambda from "aws-lambda";
import * as pathToRegexp from "path-to-regexp";
import { LambdaArg, LambdaExecution } from "../core/builder";
import { internalServerError, methodNotAllowedError, notFoundError } from "../core/errors";
import { ok } from "../core/responses";
import { isAPIGatewayProxyResult, ServicesWithBody, ServicesWithParameters } from "../middlewares/proxy";

const runProxy = async <TServices>(
  func: ProxyFunc<TServices>,
  arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) => {
  const result = await func({
    context: arg.context,
    event: arg.event,
    services: arg.services as TServices & ServicesWithBody & ServicesWithParameters,
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
    services: TServices & ServicesWithBody & ServicesWithParameters,
  }) => Promise<any>;

/**
 * This handler is for lambda proxy integrations.
 * Allows to return any object as a result, and also passes
 * convenience methods in services for body and parameters.
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

export type ProxyRoutes<TServices> = Record<string, ProxyMethods<TServices>>;

/**
 * Router for proxy integration.
 * @param router The router configuration
 * @param pathParameterName The name of the pathParameter used for catch all (e.g. users/{proxy+} -> proxy).
 */
export const proxyRouter = <TServices = any>(router: ProxyRoutes<TServices>, pathParameterName = "proxy")
  : LambdaExecution<awsLambda.APIGatewayProxyEvent, TServices> => {

  const routerPaths = Object.keys(router).map((spec) => ({
    methods: router[spec],
    pathEval: pathToRegexp(spec),
    pathParameters: pathToRegexp.parse(spec),
    spec,
  }));

  return async (arg: LambdaArg<awsLambda.APIGatewayProxyEvent, TServices>) => {

    if (!(arg.event.pathParameters && arg.event.pathParameters[pathParameterName])) {
      throw internalServerError(
        `Unable to find path parameter ${pathParameterName} - Did you correctly setup API Gateway integration?`);
    }

    const subPath = decodeURIComponent(arg.event.pathParameters[pathParameterName]);

    for (const routerPath of routerPaths) {
      const pathEvaluation = routerPath.pathEval.exec(subPath);
      if (!pathEvaluation) {
        continue;
      }

      const func = routerPath.methods[arg.event.httpMethod.toLowerCase()] as ProxyFunc<TServices> | undefined;

      if (!func) {
        throw methodNotAllowedError(`Method ${arg.event.httpMethod.toLowerCase()} is not allowed.`);
      }

      for (let index = 0; index < pathEvaluation.length; index++) {
        const element = pathEvaluation[index];
        const pathParameter = routerPath.pathParameters[index];
        if (typeof pathParameter === "object") {
          arg.event.pathParameters[pathParameter.name] = element;
        }
      }

      return runProxy(func, arg);
    }

    throw notFoundError(arg.event.path, "No suitable route found.", { [pathParameterName]: subPath });
  };

};
