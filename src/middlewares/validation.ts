import { HttpUnoEvent } from "../core";
import { FunctionArg, FunctionExecution, Middleware } from "../core/builder";
import { validationError } from "../core/errors";
import { JSONSchema } from "../core/json-schema";
import { validate } from "../core/validator";
import { ServicesWithBody, ServicesWithParameters } from "./http";

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
  : Middleware<HttpUnoEvent, ServicesWithBody> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, ServicesWithBody>,
    next: FunctionExecution<any, any>): Promise<any> => {

    switch (arg.event.httpMethod) {
      case "delete":
      case "get":
      case "head":
      case "options":
        return next(arg);
    }

    if (!arg.services.body) {
      throw new Error("Missing body service - did you forget a middleware?");
    }

    const bodyAsObject = arg.services.body();

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
  : Middleware<HttpUnoEvent, ServicesWithParameters> => {
  return async (
    arg: FunctionArg<HttpUnoEvent, ServicesWithParameters>,
    next: FunctionExecution<any, any>): Promise<any> => {

    if (!arg.services.parameters) {
      throw new Error("Missing parameters service - did you forget a middleware?");
    }

    const validationErrors = validate(schema, arg.services.parameters(), "parameters");
    if (validationErrors.length > 0) {
      throw validationError(validationErrors);
    }

    return next(arg);
  };
};
