import { LambdaArg, LambdaExecution, Middleware } from "@src/builder";
import { validationError } from "@src/errors";
import { JSONSchema } from "@src/json-schema";
import { ServicesWithParseBody, ServicesWithParseParameters } from "@src/middlewares";
import { validate } from "@src/validator";
import * as awsLambda from "aws-lambda";

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
  : Middleware<awsLambda.APIGatewayProxyEvent, ServicesWithParseBody> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, ServicesWithParseBody>,
    next: LambdaExecution<any, any>): Promise<any> => {

    if (!arg.services.parseBody) {
      throw new Error("Missing parseBody service - did you forget a middleware?");
    }

    const bodyAsObject = arg.services.parseBody();

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
  : Middleware<awsLambda.APIGatewayProxyEvent, ServicesWithParseParameters> => {
  return async (
    arg: LambdaArg<awsLambda.APIGatewayProxyEvent, ServicesWithParseParameters>,
    next: LambdaExecution<any, any>): Promise<any> => {

    if (!arg.services.parseParameters) {
      throw new Error("Missing parseParameters service - did you forget a middleware?");
    }

    const validationErrors = validate(schema, arg.services.parseParameters(), "parameters");
    if (validationErrors.length > 0) {
      throw validationError(validationErrors);
    }

    return next(arg);
  };
};
