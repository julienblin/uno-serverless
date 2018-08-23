import { HttpUnoEvent } from "../core";
import { validationError } from "../core/errors";
import { JSONSchema } from "../core/json-schema";
import { FunctionArg, FunctionExecution, Middleware } from "../core/uno";
import { validateAndThrow } from "../core/validator";

/**
 * This middleware validates the event using JSON Schema.
 */
export const validateEvent = (schema: JSONSchema)
  : Middleware<any, any> => {
  return async (
    arg: FunctionArg<any, any>,
    next: FunctionExecution<any, any>): Promise<any> => {

    validateAndThrow(schema, arg.event, "event");

    return next(arg);
  };
};

/**
 * @deprecated - Use event.body({ validate: schema }) instead.
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

    arg.event.body({ validate: schema });

    return next(arg);
  };
};

/**
 * This middleware validates the parameters using JSON Schema.
 * Requires the addition of a middleware to parse the parameters before it.
 */
export const validateParameters = (schema: JSONSchema)
  : Middleware<HttpUnoEvent, any> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, any>,
    next: FunctionExecution<any, any>): Promise<any> => {

    validateAndThrow(schema, arg.event.parameters, "parameters");

    return next(arg);
  };
};
