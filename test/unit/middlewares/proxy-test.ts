import { cors, responseHeaders } from "@middlewares/proxy";
import { lambda } from "@src/builder";
import { createContainerFactory } from "@src/container";
import { randomStr } from "@src/utils";
import { createLambdaContext } from "@test/lambda-helper-test";
import { APIGatewayProxyResult } from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";

describe("responseHeaders middleware", () => {

  it("should return headers if result is APIGatewayProxyResult", async () => {
    const headers = {
      "X-Header": "foo",
      "X-Time": async (headerArg: any, headerResult: any) => (headerResult.time),
    };

    const time = new Date().getTime();

    const handler = lambda()
      .use(responseHeaders(headers))
      .handler<any, APIGatewayProxyResult, any>(async () => ({
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
      (e, r) => {}) as APIGatewayProxyResult;

    expect(result.headers!["X-Handler-Header"]).to.equal("bar");
    expect(result.headers!["X-Header"]).to.equal(headers["X-Header"]);
    expect(result.headers!["X-Time"]).to.equal(time);
  });

  it("should do nothing if result is not APIGatewayProxyResult", async () => {
    const headers = { "X-Header": "foo" };
    const handler = lambda()
      .use(responseHeaders(headers))
      .handler<any, APIGatewayProxyResult, any>(async () => ({
        foo: "bar",
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {}) as APIGatewayProxyResult;

    expect(result.headers).to.be.undefined;
  });

});

describe("cors middleware", () => {

  it("should inject default origin", async () => {
    const handler = lambda()
      .use(cors())
      .handler<any, APIGatewayProxyResult, any>(async () => ({
        body: "",
        statusCode: HttpStatusCodes.OK,
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {}) as APIGatewayProxyResult;

    expect(result.headers!["Access-Control-Allow-Origin"]).to.equal("*");
  });

  it("should inject custom origin", async () => {
    const handler = lambda()
      .use(cors("example.org"))
      .handler<any, APIGatewayProxyResult, any>(async () => ({
        body: "",
        statusCode: HttpStatusCodes.OK,
      }));

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {}) as APIGatewayProxyResult;

    expect(result.headers!["Access-Control-Allow-Origin"]).to.equal("example.org");
  });

});
