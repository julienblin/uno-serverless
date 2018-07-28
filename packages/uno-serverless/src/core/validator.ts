import * as Ajv from "ajv";
import { ErrorData, validationError } from "./errors";
import { JSONSchema } from "./json-schema";

const ajv = new Ajv({
  allErrors: true,
});

/**
 * Validates data based on schema, returning ErrorData.
 * @param defaultTarget The default target to use if it cannot be determined.
 */
export const validate = (schema: JSONSchema, data: any, defaultTarget?: string) => {
  const validationErrors: ErrorData[] = [];

  if (!ajv.validate(schema, data) && ajv.errors) {
    ajv.errors.forEach((e) => {
      const target = e.dataPath.startsWith(".") ? e.dataPath.substring(1) : e.dataPath;
      validationErrors.push({
        code: e.keyword,
        data: e.params,
        message: e.message ? e.message : "unknown error",
        target: target ? target : defaultTarget,
      });
    });
  }

  return validationErrors;
};

/**
 * Validates data based on schema, throwing validationError when it does not validate.
 * @param defaultTarget The default target to use if it cannot be determined.
 */
export const validateAndThrow = (schema: JSONSchema, data: any, defaultTarget?: string, errorMessage?: string) => {
  const validationErrors = validate(schema, data, defaultTarget);

  if (validationErrors.length > 0) {
    throw validationError(validationErrors, errorMessage);
  }
};
