import { expect } from "chai";
import * as HttpStatusCode from "http-status-codes";
import { testAdapter, uno } from "../../../src/core/uno";
import { http, httpMethodRouter, httpRouter } from "../../../src/handlers/http";
import { parseBodyAsJSON } from "../../../src/middlewares/http";

describe("http handler", () => {

  it("should run http handler with anonymous object", async () => {

    const testBody = { foo: "bar" };
    const handler = uno(testAdapter())
      .use(parseBodyAsJSON())
      .handler(http(async ({ event }) => event.body()));

    const lambdaResult = await handler(
      {
        rawBody: JSON.stringify(testBody),
      });

    expect(lambdaResult.body).to.deep.equal(testBody);
    expect(lambdaResult.statusCode).to.equal(HttpStatusCode.OK);
  });

  it("should run http handler with undefined", async () => {

    const handler = uno(testAdapter())
      .handler(http(async () => undefined));

    try {
      await handler();
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("notFound");
      expect(error.getStatusCode()).to.equal(HttpStatusCode.NOT_FOUND);
    }
  });

  it("should run http handler with HttpUnoResponse", async () => {

    const handler = uno(testAdapter())
      .handler(http(async () => ({
        body: "hello",
        statusCode: HttpStatusCode.IM_A_TEAPOT,
      })));

    const lambdaResult = await handler();

    expect(lambdaResult.body).to.equal("hello");
    expect(lambdaResult.statusCode).to.equal(HttpStatusCode.IM_A_TEAPOT);
  });

});

describe("httpMethodMethod handler", () => {

  it("should run the correct handler", async () => {

    const handler = uno(testAdapter())
      .handler(httpMethodRouter({
        get: async () => "get-method",
        post: async () => "post-method",
      }));

    const lambdaResult = await handler(
      {
        httpMethod: "post",
      });

    expect(lambdaResult.body).to.equal("post-method");
  });

  it("should return methodNotAllowed", async () => {

    const handler = uno(testAdapter())
      .handler(httpMethodRouter({
        get: async () => "get-method",
        post: async () => "post-method",
      }));

    try {
      await handler(
        {
          httpMethod: "options",
        });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("methodNotAllowed");
      expect(error.getStatusCode()).to.equal(HttpStatusCode.METHOD_NOT_ALLOWED);
    }
  });

});

describe("httpRouter handler", () => {

  it("should route simple calls and parameters", async () => {

    const handler = uno(testAdapter())
      .handler(httpRouter({
        "": {
          get: async () => "empty",
        },
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
      { path: "", method: "get", expected: "empty" },
      { path: "CA/another-route", method: "get", expected: "first-param-CA" },
      { path: "users", method: "get", expected: "list-method" },
      { path: "users", method: "post", expected: "post-method" },
      { path: "users/foo", method: "get", expected: "get-method-foo" },
      { path: "users/bar", method: "put", expected: "put-method-bar" },
    ];

    for (const test of tests) {
      const lambdaResult = await handler(
        {
          httpMethod: test.method,
          parameters: {
            proxy: test.path,
          },
          url: `/api/${test.path}`,
        });

      expect(lambdaResult.body).to.equal(test.expected);
    }
  });

  it("should throw if method not found.", async () => {

    const handler = uno(testAdapter())
      .handler(httpRouter({
        users: {
          get: async () => "list-method",
        },
      }));

    try {
      await handler(
        {
          httpMethod: "POST",
          parameters: {
            proxy: "users",
          },
          url: "/api/users",
        });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("methodNotAllowed");
    }
  });

  it("should throw if route not found.", async () => {

    const handler = uno(testAdapter())
      .handler(httpRouter({
        users: {
          get: async () => "list-method",
        },
      }));

    try {
      await handler(
        {
          httpMethod: "POST",
          parameters: {
            proxy: "users/foo",
          },
          url: "/api/users/foo",
        });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("notFound");
    }
  });

});
