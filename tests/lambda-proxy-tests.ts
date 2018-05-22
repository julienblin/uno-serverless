// tslint:disable-next-line:no-implicit-dependencies
import { APIGatewayProxyEvent, APIGatewayProxyResult, CustomAuthorizerResult, ProxyCallback } from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";
import { lambdaProxy, LambdaProxyError } from "../src/lambda-proxy";
import { APIGatewayProxyResultProvider } from "../src/results";
import { createLambdaContext, randomStr } from "./lambda-helper-tests";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-empty
// tslint:disable:no-null-keyword

describe("lambdaProxy", () => {

  class MockAPIGatewayProxyResultProvider implements APIGatewayProxyResultProvider {

    public constructor(public readonly proxyResult: APIGatewayProxyResult) {
    }

    public getAPIGatewayProxyResult() { return this.proxyResult; }
  }

  const createAPIGatewayProxyEvent =
    (args: {
      body?: {};
      headers?:
      { [name: string]: string };
      method?: string;
      pathParameters?: { [name: string]: string };
      queryStringParameters?: { [name: string]: string }; } = {}): APIGatewayProxyEvent => ({
      body: args.body
        ? (typeof args.body === "string") ? args.body : JSON.stringify(args.body)
        : null,
      headers: args.headers ? args.headers : {},
      httpMethod: args.method ? args.method : "GET",
      isBase64Encoded: false,
      path: "/unit-tests",
      pathParameters: args.pathParameters ? args.pathParameters : null,
      queryStringParameters: args.queryStringParameters ? args.queryStringParameters : null,
      requestContext: {
        accountId: randomStr(),
        apiId: randomStr(),
        httpMethod: "GET",
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          sourceIp: "127.0.0.1",
          user: null,
          userAgent: null,
          userArn: null,
        },
        requestId: randomStr(),
        requestTimeEpoch: new Date().getTime(),
        resourceId: randomStr(),
        resourcePath: randomStr(),
        stage: randomStr(),
      },
      resource: randomStr(),
      stageVariables: {},
    });

  const nullCallback: ProxyCallback = (e, r) => {};

  it("should execute and process a APIGatewayProxyResultProvider", async () => {
    const lambda = lambdaProxy(
      async () =>
        new MockAPIGatewayProxyResultProvider({
          body: "ok",
          statusCode: HttpStatusCodes.OK,
        }));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal("ok");
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should execute and process an object", async () => {
    const obj = { foo: "bar" };
    const lambda = lambdaProxy(async () => (obj));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal(JSON.stringify(obj));
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should execute and process undefined", async () => {
    const lambda = lambdaProxy(async () => (undefined));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.NOT_FOUND);
  });

  it("should handle errors", async () => {

    const errorMessage = "This is an error.";
    let loggedLambdaError: LambdaProxyError | undefined;

    const lambda = lambdaProxy(
      async () => { throw new Error(errorMessage); },
      {
        errorLogger: (lambdaError) => { loggedLambdaError = lambdaError; },
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.INTERNAL_SERVER_ERROR);
    expect(lambdaResult.body).to.contain(errorMessage);

    expect(loggedLambdaError).not.be.undefined;
    expect(loggedLambdaError!.event).to.not.be.undefined;
    expect(loggedLambdaError!.context).to.not.be.undefined;
    expect(loggedLambdaError!.result).to.not.be.undefined;
    expect(loggedLambdaError!.error.message).to.equal(errorMessage);
  });

  it("should add cors headers *", async () => {
    const lambda = lambdaProxy(
      async () =>
        new MockAPIGatewayProxyResultProvider({
          body: "",
          headers: {
            "X-Custom": "foo",
          },
          statusCode: HttpStatusCodes.OK,
        }),
      {
        cors: true,
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.headers!["Access-Control-Allow-Origin"]).to.equal("*");
    expect(lambdaResult.headers!["X-Custom"]).to.equal("foo");
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should add custom cors headers", async () => {
    const lambda = lambdaProxy(
      async () =>
        new MockAPIGatewayProxyResultProvider({
          body: "",
          headers: {
            "X-Custom": "foo",
          },
          statusCode: HttpStatusCodes.OK,
        }),
      {
        cors: "www.example.org",
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.headers!["Access-Control-Allow-Origin"]).to.equal("www.example.org");
    expect(lambdaResult.headers!["X-Custom"]).to.equal("foo");
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should parse JSON Body", async () => {
    const inputBody = { foo: "bar" };
    const lambda = lambdaProxy(async ({ body }) => (body()));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ body: inputBody, method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal(JSON.stringify(inputBody));
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should parse JSON Body when empty", async () => {
    const lambda = lambdaProxy(async ({ body }) => (body()));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ body: "", method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.NOT_FOUND);
  });

  it("should return bad request on malformed JSON.", async () => {
    const lambda = lambdaProxy(
      async ({ body }) => (body()),
      {
        errorLogger: (lambdaError) => { },
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ body: "{ 'asd:", method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.BAD_REQUEST);
  });

  it("should parse FORM Body", async () => {
    const lambda = lambdaProxy(async ({ body }) => (body()));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({
        body: "foo=bar&hello=world",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.body).to.equal(JSON.stringify({ foo: "bar", hello: "world" }));
    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should parse FORM Body when empty", async () => {
    const lambda = lambdaProxy(async ({ body }) => (body()));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({
        body: "",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.NOT_FOUND);
  });

  it("should get parameters", async () => {
    const lambda = lambdaProxy(async ({ parameters }) => (parameters()));

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({
        body: "",
        pathParameters: {
          pathId: "foo",
        },
        queryStringParameters: {
          qsId: "bar",
        }}),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
    const bodyResult = JSON.parse(lambdaResult.body);
    expect(bodyResult.pathId).to.equal("foo");
    expect(bodyResult.qsId).to.equal("bar");
  });

  it("should validate Body - correct", async () => {
    const inputBody = { foo: 3, bar: "mandatory" };
    const lambda = lambdaProxy(
      async ({ body }) => (body()),
      {
        validation: {
          body: {
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
          },
        },
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ body: inputBody, method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should validate Body - incorrect", async () => {
    const inputBody = { foo: "foo" };
    const lambda = lambdaProxy(
      async ({ body }) => (body()),
      {
        validation: {
          body: {
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
          },
        },

        errorLogger: (lambdaError) => { },
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ body: inputBody, method: "POST" }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.BAD_REQUEST);
  });

  it("should validate Parameters - correct", async () => {
    const lambda = lambdaProxy(
      async ({ parameters }) => (parameters()),
      {
        validation: {
          parameters: {
            additionalProperties: false,
            properties: {
              bar: {
                type: "string",
              },
              id: {
                type: "string",
              },
            },
            required: [ "bar" ],
          },
        },
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ method: "GET", pathParameters: { bar: "foo" }, queryStringParameters: { id: "5" } }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should validate Parameters - incorrect", async () => {
    const lambda = lambdaProxy(
      async ({ parameters }) => (parameters()),
      {
        validation: {
          parameters: {
            additionalProperties: false,
            properties: {
              bar: {
                type: "string",
              },
            },
            required: [ "bar" ],
          },
        },

        /*errorLogger: (lambdaError) => { },*/
      });

    const lambdaResult = await lambda(
      createAPIGatewayProxyEvent({ method: "GET", pathParameters: { bar: "foo" }, queryStringParameters: { id: "5" } }),
      createLambdaContext(),
      nullCallback) as APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.BAD_REQUEST);
  });

});
