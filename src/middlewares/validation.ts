import { LambdaArg, LambdaExecution, Middleware } from "@src/builder";
import { validationError } from "@src/errors";
import { JSONSchema } from "@src/json-schema";
import { validate } from "@src/validator";

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
