import * as awsLambda from "aws-lambda";
import { LambdaArg, LambdaExecution, Middleware } from "../core/builder";
import { validationError } from "../core/errors";
import { JSONSchema } from "../core/json-schema";
import { validate } from "../core/validator";
import { ServicesWithBody, ServicesWithParameters } from "./proxy";

/**
 * This middleware validates the event using JSON Schema.
 */
export const validateEvent = (schema: JSONSchema)
  : Middleware<any, any> => {
  return async (
    arg: LambdaArg<any, any>,
    next: LambdaExecution<any, any>): Promise<any> => {

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
  : Middleware<awsLambda.APIGatewayProxyEvent, ServicesWithBody> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, ServicesWithBody>,
    next: LambdaExecution<any, any>): Promise<any> => {

    switch (arg.event.httpMethod.toLowerCase()) {
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
  : Middleware<awsLambda.APIGatewayProxyEvent, ServicesWithParameters> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, ServicesWithParameters>,
    next: LambdaExecution<any, any>): Promise<any> => {

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
