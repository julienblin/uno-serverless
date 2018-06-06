import { ErrorData } from "@src/errors";
import { JSONSchema } from "@src/json-schema";
import * as Ajv from "ajv";

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
