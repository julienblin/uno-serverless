import { expect } from "chai";
import { lambda } from "../../../src/core/builder";
import { JSONSchema } from "../../../src/core/json-schema";
import { randomStr } from "../../../src/core/utils";
import { parseBodyAsJSON, parseParameters } from "../../../src/middlewares/proxy";
import { validateParameters } from "../../../src/middlewares/validation";
import { validateBody, validateEvent } from "../../../src/middlewares/validation";
import { createLambdaContext } from "../lambda-helper-test";

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

describe("validateBody middleware", () => {

  it("should validate body.", async () => {
    const schema: JSONSchema = {
      additionalProperties: false,
      properties: {
        bar: {
          type: "string",
        },
        foo: {
          type: "number",
        },
      },
      required: [ "bar" ],
    };

    const handler = lambda()
      .use([
        parseBodyAsJSON(),
        validateBody(schema),
      ])
      .handler(async () => { });

    try {
      await handler(
        {
          body: JSON.stringify({ foo: "foo" }),
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("validationError");
    }
  });

});

describe("validateParameters middleware", () => {

  it("should validate parameters.", async () => {
    const schema: JSONSchema = {
      additionalProperties: false,
      properties: {
        bar: {
          type: "string",
        },
      },
      required: [ "bar" ],
    };

    const handler = lambda()
      .use([
        parseParameters(),
        validateParameters(schema),
      ])
      .handler(async () => { });

    try {
      await handler(
        {
          pathParameters: { bar: "foo" },
          queryStringParameters: { id: "5" },
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("validationError");
    }
  });

});
