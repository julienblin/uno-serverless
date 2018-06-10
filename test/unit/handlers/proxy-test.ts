import * as awsLambda from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCode from "http-status-codes";
import { lambda } from "../../../src/core/builder";
import { proxy, proxyByMethod } from "../../../src/handlers/proxy";
import { parseBodyAsJSON } from "../../../src/middlewares/proxy";
import { createAPIGatewayProxyEvent, createLambdaContext } from "../lambda-helper-test";

describe("proxy handler", () => {

  it("should run proxy handler with anonymous object", async () => {

    const testBody = { foo: "bar" };
    const handler = lambda()
      .use(parseBodyAsJSON())
      .handler(proxy<{}>(async ({ services: { parseBody } }) => parseBody()));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent({
        body: JSON.stringify(testBody),
      }),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.body).to.deep.equal(testBody);
    expect(lambdaResult.statusCode).to.equal(HttpStatusCode.OK);
  });

  it("should run proxy handler with undefined", async () => {

    const handler = lambda()
      .handler(proxy<{}>(async () => undefined));

    try {
      await handler(
        createAPIGatewayProxyEvent({}),
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("notFound");
      expect(error.getStatusCode()).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it("should run proxy handler with APIGatewayProxyResult", async () => {

    const handler = lambda()
      .handler(proxy<{}>(async () => ({
        body: "hello",
        statusCode: HttpStatusCode.IM_A_TEAPOT,
      })));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal("hello");
    expect(lambdaResult.statusCode).to.equal(HttpStatusCode.IM_A_TEAPOT);
  });

});

describe("proxyByMethod handler", () => {

  it("should run the correct handler", async () => {

    const handler = lambda()
      .handler(proxyByMethod<{}>({
        get: async () => "get-method",
        post: async () => "post-method",
      }));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent({
        method: "POST",
      }),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal("post-method");
  });

  it("should return methodNotAllowed", async () => {

    const handler = lambda()
      .handler(proxyByMethod<{}>({
        get: async () => "get-method",
        post: async () => "post-method",
      }));

    try {
      await handler(
        createAPIGatewayProxyEvent({
          method: "OPTIONS",
        }),
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("methodNotAllowed");
      expect(error.getStatusCode()).to.equal(HttpStatusCode.METHOD_NOT_ALLOWED);
    }
  });

});