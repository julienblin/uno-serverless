import { HttpStatusCodes } from "./http-status-codes";

export interface ErrorData {
  code: string;
  data?: object;
  details?: ErrorData[];
  message: string;
  target?: string;
}

export interface StatusCodeProvider {
  getStatusCode(): number;
}

export const isStatusCodeProvider = (error: any): error is StatusCodeProvider =>
  (typeof error.getStatusCode === "function");

/**
 * Builds a non-standard error payload that can still be interpreted
 * with a status code.
 */
export const buildNonStandardError = (errorPayload: any, httpStatusCode: number): Error & StatusCodeProvider => {
  let error: any;
  if (errorPayload.message) {
    error = new Error(errorPayload.message);
  } else {
    error = new Error();
  }

  Object.keys(errorPayload).forEach((key) => {
    error[key] = errorPayload[key];
  });
  error.getStatusCode = () => httpStatusCode;
  Object.freeze(error);

  return error;
};

/**
 * Builds a custom error with additional data.
 */
export const buildError = (
  errorData: ErrorData,
  httpStatusCode: number): Error & ErrorData & StatusCodeProvider => {

  const error: any = new Error(errorData.message);
  error.code = errorData.code;
  error.data = errorData.data;
  error.details = errorData.details;
  error.target = errorData.target;
  error.getStatusCode = () => httpStatusCode;
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

export const unauthorizedError = (target: string, message: string) =>
  buildError(
    {
      code: "unauthorized",
      message,
      target,
    },
    HttpStatusCodes.UNAUTHORIZED);

export const notFoundError = (target: string, message?: string, data?: object) =>
  buildError(
    {
      code: "notFound",
      data,
      message: message || `The target ${target} could not be found.`,
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

export const methodNotAllowedError = (message: string) =>
  buildError(
    {
      code: "methodNotAllowed",
      message,
    },
    HttpStatusCodes.METHOD_NOT_ALLOWED);

export const validationError = (errors: ErrorData[], message?: string) =>
  buildError(
    {
      code: "validationError",
      details: errors.map((e) => ({ code: e.code, message: e.message, target: e.target, data: e.data })),
      message: message || "Validation failed",
    },
    HttpStatusCodes.BAD_REQUEST);

export const conflictError = (message: string, data?: object) =>
  buildError(
    {
      code: "conflict",
      data,
      message,
    },
    HttpStatusCodes.CONFLICT);

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
      details: [{ code: error.name, message: error.message, data: error }],
      message: message || error.toString(),
      target,
    },
    HttpStatusCodes.BAD_GATEWAY);

/** Creates a Proxy around target which traps all errors and encapsulate into dependencyErrors. */
export const dependencyErrorProxy = <T extends object>(target: T, targetName: string) => {
  const dependencyHandler: ProxyHandler<T> = {
    get: (proxyTarget, name, receiver) => {
      const prop = proxyTarget[name];
      if (typeof (prop) !== "function") { return prop; }

      return (...args) => {
        try {
          const result = Reflect
            .get(proxyTarget, name, receiver)
            .apply(proxyTarget, args);

          if (result && (typeof result.catch === "function")) {
            return result.catch((error) => {
              if (error && isStatusCodeProvider(error)) {
                throw error;
              }
              throw dependencyError(targetName, error);
            });
          }

          return result;
        } catch (error) {
          if (error && isStatusCodeProvider(error)) {
            throw error;
          }
          throw dependencyError(targetName, error);
        }
      };
    },
  };

  return new Proxy<T>(target, dependencyHandler);
};
