import { validateEvent } from "@middlewares/validation";
import { lambda } from "@src/builder";
import { JSONSchema } from "@src/json-schema";
import { randomStr } from "@src/utils";
import { createLambdaContext } from "@test/lambda-helper-test";
import { expect } from "chai";

describe("validateEvent middleware", () => {

  it("should validate event.", async () => {
    const schema: JSONSchema = {
      properties: {
        bar: {
          type: "string",
        },
        foo: {
          type: "number",
        },
      },
      required: ["bar"],
    };

    const handler = lambda()
      .use(validateEvent(schema))
      .handler(async () => { });

    try {
      await handler(
        {
          foo: randomStr(),
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("validationError");
    }
  });

});
