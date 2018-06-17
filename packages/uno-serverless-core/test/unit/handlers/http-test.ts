import * as awsLambda from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCode from "http-status-codes";
import { uno } from "../../../src/core/uno";
import { http, httpMethodRouter, httpRouter } from "../../../src/handlers/http";
import { parseBodyAsJSON } from "../../../src/middlewares/http";
import { awsLambdaAdapter } from "../../../src/providers/aws";
import { createAPIGatewayProxyEvent, createLambdaContext } from "../lambda-helper-test";

describe("http handler", () => {

  it("should run proxy handler with anonymous object", async () => {

    const testBody = { foo: "bar" };
    const handler = uno(awsLambdaAdapter())
      .use(parseBodyAsJSON())
      .handler(http(async ({ event }) => event.body()));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent({
        body: JSON.stringify(testBody),
      }),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal(JSON.stringify(testBody));
    expect(lambdaResult.statusCode).to.equal(HttpStatusCode.OK);
  });

  it("should run proxy handler with undefined", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(http(async () => undefined));

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

    const handler = uno(awsLambdaAdapter())
      .handler(http(async () => ({
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

    const handler = uno(awsLambdaAdapter())
      .handler(httpMethodRouter({
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

    const handler = uno(awsLambdaAdapter())
      .handler(httpMethodRouter({
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

  it("should route simple calls and parameters", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(httpRouter({
        ":firstParam/another-route": {
          get: async ({ event }) => "first-param-" + event.parameters.firstParam,
        },
        "users": {
          get: async () => "list-method",
          post: async () => "post-method",
        },
        "users/:id": {
          get: async ({ event }) => "get-method-" + event.parameters.id,
          put: async ({ event }) => "put-method-" + event.parameters.id,
        },
      }));

    const tests = [
      { path: "CA/another-route", method: "GET", expected: "first-param-CA" },
      { path: "users", method: "GET", expected: "list-method" },
      { path: "users", method: "POST", expected: "post-method" },
      { path: "users/foo", method: "GET", expected: "get-method-foo" },
      { path: "users/bar", method: "PUT", expected: "put-method-bar" },
    ];

    for (const test of tests) {
      const lambdaResult = await handler(
        createAPIGatewayProxyEvent({
          method: test.method,
          path: `/api/${test.path}`,
          pathParameters: {
            proxy: encodeURIComponent(test.path),
          },
        }),
        createLambdaContext(),
        (e, r) => { }) as awsLambda.APIGatewayProxyResult;

      expect(lambdaResult.body).to.equal(test.expected);
    }
  });

  it("should throw if path parameter not found.", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(httpRouter({
        users: {
          get: async () => "list-method",
        },
      }));

    try {
      await handler(
        createAPIGatewayProxyEvent({
          method: "GET",
          path: "/api/users",
        }),
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("internalServerError");
    }
  });

  it("should throw if method not found.", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(httpRouter({
        users: {
          get: async () => "list-method",
        },
      }));

    try {
      await handler(
        createAPIGatewayProxyEvent({
          method: "POST",
          path: "/api/users",
          pathParameters: {
            proxy: "users",
          },
        }),
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("methodNotAllowed");
    }
  });

  it("should throw if route not found.", async () => {

    const handler = uno(awsLambdaAdapter())
      .handler(httpRouter({
        users: {
          get: async () => "list-method",
        },
      }));

    try {
      await handler(
        createAPIGatewayProxyEvent({
          method: "POST",
          path: "/api/users/foo",
          pathParameters: {
            proxy: encodeURIComponent("users/foo"),
          },
        }),
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("notFound");
    }
  });

});
