import * as awsLambda from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCode from "http-status-codes";
import { lambda } from "../../../src/core/builder";
import { proxy, proxyByMethod, proxyRouter } from "../../../src/handlers/proxy";
import { parseBodyAsJSON, parseParameters } from "../../../src/middlewares/proxy";
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

describe("proxyRouter handler", () => {

  it("should do something", async () => {

    const handler = lambda()
      .use(parseParameters())
      .handler(proxyRouter<{}>({
        "/users": {
          get: async () => "list-method",
          post: async () => "post-method",
        },
        "/users/:id": {
          get: async ({ services }) => "get-method-" + services.parseParameters().id,
          put: async ({ services }) => "put-method-" + services.parseParameters().id,
        },
      }));

    const tests = [
      { path: "/users", method: "GET", expected: "list-method" },
      { path: "/users", method: "POST", expected: "post-method" },
      { path: "/users/johndoe", method: "GET", expected: "get-method-johndoe" },
      { path: "/users/dowjones", method: "PUT", expected: "put-method-dowjones" },
    ];

    for (const test of tests) {
      const lambdaResult = await handler(
        createAPIGatewayProxyEvent({
          method: test.method,
          path: test.path,
        }),
        createLambdaContext(),
        (e, r) => { }) as awsLambda.APIGatewayProxyResult;

      expect(lambdaResult.body).to.equal(test.expected);
    }
  });

});
