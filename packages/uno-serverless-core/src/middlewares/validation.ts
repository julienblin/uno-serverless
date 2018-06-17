import { HttpUnoEvent } from "../core";
import { validationError } from "../core/errors";
import { JSONSchema } from "../core/json-schema";
import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";
import { validate } from "../core/validator";

/**
 * This middleware validates the event using JSON Schema.
 */
export const validateEvent = (schema: JSONSchema)
  : Middleware<any, any> => {
  return async (
    arg: FunctionArg<any, any>,
    next: FunctionExecution<any, any>): Promise<any> => {

    const validationErrors = validate(schema, arg.event, "event");
    if (validationErrors.length > 0) {
      throw validationError(validationErrors);
    }

    return next(arg);
  };
};

/**
 * This middleware validates the body using JSON Schema.
 * Requires the addition of a middleware to parse the body before it.
 */
export const validateBody = (schema: JSONSchema)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<any, any>): Promise<any> => {

    switch (arg.event.httpMethod) {
      case "delete":
      case "get":
      case "head":
      case "options":
        return next(arg);
    }

    const bodyAsObject = arg.event.body();

    if (!bodyAsObject) {
      throw validationError([{ code: "required", message: "Missing body", target: "body" }]);
    }

    const validationErrors = validate(schema, bodyAsObject, "body");
    if (validationErrors.length > 0) {
      throw validationError(validationErrors);
    }

    return next(arg);
  };
};

/**
 * This middleware validates the body using JSON Schema.
 * Requires the addition of a middleware to parse the parameters before it.
 */
export const validateParameters = (schema: JSONSchema)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<any, any>): Promise<any> => {

    const validationErrors = validate(schema, arg.event.parameters, "parameters");
    if (validationErrors.length > 0) {
      throw validationError(validationErrors);
    }

    return next(arg);
  };
};
