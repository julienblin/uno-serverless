import * as HttpStatusCodes from "http-status-codes";
import { APIGatewayProxyResultProvider, BodySerializer } from "./results";

export interface ErrorData {
  code: string;
  data?: object;
  details?: ErrorData[];
  isManaged?: boolean;
  message: string;
  target?: string;
}

export const buildError = (
  errorData: ErrorData,
  httpStatusCode: number): Error & ErrorData & APIGatewayProxyResultProvider => {

  const error: any = new Error(errorData.message);
  error.code = errorData.code;
  error.data = errorData.data;
  error.details = errorData.details;
  // tslint:disable-next-line:strict-type-predicates
  error.isManaged = ((errorData.isManaged === undefined) || (errorData.isManaged === null))
    ? true
    : errorData.isManaged;
  error.target = errorData.target;
  error.getAPIGatewayProxyResult = (serializer: BodySerializer) => ({
    body: serializer({ error: errorData }),
    statusCode: httpStatusCode,
  });
  Object.freeze(error);

  return error;
};

export const internalServerError = (message: string) =>
  buildError(
    {
      code: "internalServerError",
      message,
    },
    HttpStatusCodes.INTERNAL_SERVER_ERROR);

export const notFoundError = (target: string, message?: string) =>
    buildError(
      {
        code: "notFound",
        message: message ? message : `The target ${target} could not be found.`,
        target,
      },
      HttpStatusCodes.NOT_FOUND);

export const badRequestError = (message: string, data?: object) =>
  buildError(
    {
      code: "badRequest",
      data,
      message,
    },
    HttpStatusCodes.BAD_REQUEST);

export const validationError = (errors: ErrorData[], message?: string) =>
  buildError(
    {
      code: "validationError",
      details: errors.map((e) => ({ code: e.code, message: e.message, target: e.target, data: e.data })),
      message: message ? message : "Validation failed",
    },
    HttpStatusCodes.BAD_REQUEST);

export const configurationError = (data: any, message: string) =>
  buildError(
    {
      code: "configurationError",
      data,
      message,
    },
    HttpStatusCodes.INTERNAL_SERVER_ERROR);

export const dependencyError = (target: string, error: Error, message?: string) =>
  buildError(
    {
      code: "dependencyError",
      details: [{ code: error.name, message: error.message, data: error}],
      message: message ? message : error.toString(),
      target,
    },
    HttpStatusCodes.BAD_GATEWAY);

/** Creates a Proxy around target which traps all errors and encapsulate into dependencyErrors. */
export const dependencyErrorProxy = <T extends object>(target: T, targetName: string) => {
  const dependencyHandler: ProxyHandler<T> = {
    get: (proxyTarget, name, receiver) => {
      const prop = proxyTarget[name];
      if (typeof(prop) !== "function") { return prop; }

      return (...args) => {
        try {
          const result = Reflect
            .get(proxyTarget, name, receiver)
            .apply(proxyTarget, args);

          if (result && (typeof result.catch === "function")) {
            return result.catch((error) => {
              if (error.isManaged) {
                throw error;
              }
              throw dependencyError(targetName, error);
            });
          }

          return result;
        } catch (error) {
          if (error.isManaged) {
            throw error;
          }
          throw dependencyError(targetName, error);
        }
      };
    },
  };

  return new Proxy<T>(target, dependencyHandler);
};

/**
 * Typescript decorator function that encapsulate
 * the target class in a dependencyErrorProxy.
 */
// tslint:disable-next-line:only-arrow-functions
export function dependency(target: any) {
  console.log("decorator");
  // tslint:disable-next-line:only-arrow-functions
  const newConstructor = function(args) {
    const instance = new target(args);

    return dependencyErrorProxy(instance, target.name);
  };

  newConstructor.prototype = target.prototype;

  return newConstructor;
}
