import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";
import { notFoundError } from "../../../src/core/errors";
import { ok } from "../../../src/core/responses";
import { HttpUnoEvent } from "../../../src/core/schemas";
import { uno } from "../../../src/core/uno";
import { randomStr } from "../../../src/core/utils";
import {
  cors, httpErrors, parseBodyAsFORM, parseBodyAsJSON,
  responseHeaders, serializeBodyAsJSON} from "../../../src/middlewares/http";
import { awsLambdaAdapter } from "../../../src/providers/aws";
import { createLambdaContext } from "../lambda-helper-test";

describe("responseHeaders middleware", () => {

  it("should return headers if result is APIGatewayProxyResult", async () => {
    const headers = {
      "X-Header": "foo",
      "X-Time": async (headerArg: any, headerResult: any) => (headerResult.time),
    };

    const time = new Date().getTime();

    const handler = uno(awsLambdaAdapter())
      .use(responseHeaders(headers))
      .handler(async () => ({
        body: "",
        headers: {
          "X-Handler-Header": "bar",
        },
        statusCode: HttpStatusCodes.OK,
        time,
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.headers!["X-Handler-Header"]).to.equal("bar");
    expect(result.headers!["X-Header"]).to.equal(headers["X-Header"]);
    expect(result.headers!["X-Time"]).to.equal(time);
  });

  it("should do nothing if result is not APIGatewayProxyResult", async () => {
    const headers = { "X-Header": "foo" };
    const handler = uno(awsLambdaAdapter())
      .use(responseHeaders(headers))
      .handler(async () => ({
        foo: "bar",
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.headers).to.be.undefined;
  });

});

describe("cors middleware", () => {

  it("should inject default origin", async () => {
    const handler = uno(awsLambdaAdapter())
      .use(cors())
      .handler(async () => ({
        body: "",
        statusCode: HttpStatusCodes.OK,
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.headers!["Access-Control-Allow-Origin"]).to.equal("*");
  });

  it("should inject custom origin", async () => {
    const handler = uno(awsLambdaAdapter())
      .use(cors("example.org"))
      .handler(async () => ({
        body: "",
        statusCode: HttpStatusCodes.OK,
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.headers!["Access-Control-Allow-Origin"]).to.equal("example.org");
  });

});

describe("httpErrors middleware", () => {

  it("should do nothing when no errors", async () => {
    const handlerResult = {};
    const handler = uno(awsLambdaAdapter())
      .use(httpErrors())
      .handler(async () => handlerResult);

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.equal(handlerResult);
  });

  it("should transform known errors", async () => {
    const target = "https://example.org";
    const handler = uno(awsLambdaAdapter())
      .use(httpErrors())
      .handler(async () => {
        throw notFoundError(target);
      });

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {}) as any;

    expect(result.statusCode).to.equal(HttpStatusCodes.NOT_FOUND);
    const body = JSON.parse(result.body);
    expect(body.code).to.equal("notFound");
    expect(body.target).to.equal(target);
  });

  it("should encapsulate unknown errors", async () => {
    const message = randomStr();
    const handler = uno(awsLambdaAdapter())
      .use(httpErrors())
      .handler(async () => {
        throw new Error(message);
      });

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {}) as any;

    expect(result.statusCode).to.equal(HttpStatusCodes.INTERNAL_SERVER_ERROR);
    const body = JSON.parse(result.body);
    expect(body.code).to.equal("internalServerError");
    expect(body.message).to.equal(message);
  });

});

describe("serializeBodyAsJSON middleware", () => {

  it("should serialize body.", async () => {
    const handlerResult = {
      foo: "bar",
    };

    const handler = uno(awsLambdaAdapter())
      .use(serializeBodyAsJSON())
      .handler(async () => ok(handlerResult));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(JSON.parse(result.body)).to.deep.equal(handlerResult);
    expect(result.headers!["Content-Type"]).to.equal("application/json");
  });

  it("should not serialize if body is a string.", async () => {
    const handler = uno(awsLambdaAdapter())
      .use(serializeBodyAsJSON())
      .handler(async () => ({ body: "hello" }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.body).to.equal("hello");
    expect(result.headers).to.be.undefined;
  });

  it("should serialize safely.", async () => {
    const obj1: Record<string, any> = {};
    const obj2 = {
      obj1,
    };
    obj1.obj2 = obj2;

    const handler = uno(awsLambdaAdapter())
      .use(serializeBodyAsJSON({ safe: true }))
      .handler(async () => ({ body: obj1 }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result.body).to.not.be.undefined;
  });

});

describe("parseBodyAsJSON middleware", () => {

  it("should parse body.", async () => {
    const body = {
      foo: "bar",
    };

    const handler = uno(awsLambdaAdapter())
      .use(parseBodyAsJSON())
      .handler<HttpUnoEvent, any>
        (async ({ event }) => {
          expect(event.body()).to.deep.equal(body);
        });

    await handler(
      {
        body: JSON.stringify(body),
        httpMethod: "get",
      },
      createLambdaContext(),
      (e, r) => {});
  });

});

describe("parseBodyAsFORM middleware", () => {

  it("should parse body.", async () => {
    const body = {
      foo: "bar",
    };

    const handler = uno(awsLambdaAdapter())
      .use(parseBodyAsFORM())
      .handler<HttpUnoEvent, any>
        (async ({ event }) => {
          expect(event.body()).to.deep.equal(body);
        });

    await handler(
      {
        body: "foo=bar",
        httpMethod: "get",
      },
      createLambdaContext(),
      (e, r) => {});
  });

});
