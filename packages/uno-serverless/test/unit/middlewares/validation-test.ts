import { expect } from "chai";
import { JSONSchema } from "../../../src/core/json-schema";
import { uno } from "../../../src/core/uno";
import { randomStr } from "../../../src/core/utils";
import { parseBodyAsJSON } from "../../../src/middlewares/http";
import { validateParameters } from "../../../src/middlewares/validation";
import { validateBody, validateEvent } from "../../../src/middlewares/validation";
import { awsLambdaAdapter } from "../../../src/providers/aws";
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

    const handler = uno(awsLambdaAdapter())
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
      required: ["bar"],
    };

    const handler = uno(awsLambdaAdapter())
      .use([
        parseBodyAsJSON(),
        validateBody(schema),
      ])
      .handler(async () => { });

    try {
      await handler(
        {
          body: JSON.stringify({ foo: "foo" }),
          httpMethod: "PUT",
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("validationError");
    }
  });

  it("should validate missing body.", async () => {
    const handler = uno(awsLambdaAdapter())
      .use([
        parseBodyAsJSON(),
        validateBody({}),
      ])
      .handler(async () => { });

    try {
      await handler(
        {
          httpMethod: "POST",
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("validationError");
    }
  });

  it("should not validate if HTTP method is not compatible.", async () => {
    const handler = uno(awsLambdaAdapter())
      .use([
        parseBodyAsJSON(),
        validateBody({}),
      ])
      .handler(async () => { });

    await handler(
      {
        httpMethod: "GET",
      },
      createLambdaContext(),
      (e, r) => { });
    expect(true);
  });

  it("should throw if missing body.", async () => {
    const handler = uno(awsLambdaAdapter())
      .use(validateBody({}))
      .handler(async () => { });

    try {
      await handler(
        {
          httpMethod: "PATCH",
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("body");
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
      required: ["bar"],
    };

    const handler = uno(awsLambdaAdapter())
      .use(validateParameters(schema))
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

  it("should throw if missing parameters.", async () => {
    const handler = uno(awsLambdaAdapter())
      .use(validateParameters({}))
      .handler(async () => { });

    try {
      await handler(
        {},
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.message).to.contain("parameters");
    }
  });

});
