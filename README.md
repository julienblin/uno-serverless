[![Travis](https://travis-ci.org/julienblin/opiniated-lambda.svg?branch=master)](https://travis-ci.org/julienblin/opiniated-lambda)
[![npm](https://img.shields.io/npm/v/opiniated-lambda.svg)](https://www.npmjs.com/package/opiniated-lambda)
[![Coverage Status](https://coveralls.io/repos/github/julienblin/opiniated-lambda/badge.svg?branch=master)](https://coveralls.io/github/julienblin/opiniated-lambda?branch=master)

# opiniated-lambda

Provides an opiniated framework for creating API using AWS Serverless stack (API Gateway/Lambda) on Node 8 / TypeScript.
This framework makes some choices and imposes some conventions. If you require a lot flexibility, there are probably better options.

- [Features](#user-content-features)
- [Getting started](#user-content-getting-started)
  - [Using lambdaProxy](#using-lambdaProxy)
  - [Using lambdaAuthorizerBearer](#using-lambdaAuthorizerBearer)
  - [Using lambda](#using-lambda)
- [Health checks](#user-content-health-checks)
- [Configuration service](#user-content-configuration-service)
- [Dependency errors](#user-content-dependency-errors)
- [Warmup support](#user-content-warmup-support)

# Features
- Allow the creation of simple lambda handlers using async/await & Promises, e.g.:
```typescript
import { lambdaProxy, ok } from "opiniated-lambda";

export const handler = lambdaProxy(async ({ parameters }) => {
  const result = await service.getById(parameters().id);

  return ok(result);
});
```

- Errors are properly handled and return a consistent payload:
```json
{
  "error": {
    "code": "<error code>",
    "message": "<error message>",
    "target": "<and indication for the target of an error, e.g. back-end API name or property name for validation>",
    "details": [],
    "data": "Any additional data if necessary."
  }
}
```
- Provides additional facilities for validating input using JSON schema (using [ajv](https://github.com/epoberezkin/ajv)) & returning CORS headers
- Provides a framework for exposing a health check endpoint
- Support for isolating dependency errors.
- Support for managing service configuration
- Support for Lambda warmup

# Getting started

## Prerequisites
- An API Gateway / Lambda solution using Node 8. We recommend using [serverless](https://serverless.com/) or [AWS SAM](https://github.com/awslabs/serverless-application-model).

## Installation

```bash
  npm install --save opiniated-lambda
```

## Using lambdaProxy

The `lambdaProxy` function allows you to create handlers that responds to API Gateway events configured for [Lambda Proxy integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html).

### The simplest handler

```typescript
import { lambdaProxy, ok } from "opiniated-lambda";

export const handler = lambdaProxy(async () => ok({ foo: "bar" }));
```

This simple handler will respond to API Gateway with the following message:
```json
{
  "body": "{ \"foo\": \"bar\" }",
  "statusCode": 200
}
```

### Generating response

The `lambdaProxy` function argument is expected to return a Promise with either a `Result` or an object.
Returning an object will default to OK or NO_CONTENT if it's undefined/null.

#### Returning a serialized object

```typescript
import { lambdaProxy, ok } from "opiniated-lambda";

export const handler = lambdaProxy(async () => ({ foo: "bar" }));
// Returns OK with body { "foo": "bar" }

export const handler = lambdaProxy(async () => (undefined));
// Returns 404 NOT FOUND
```

#### Returning an HTTP Result

Convenience methods are provided for common http responses:
```typescript
import { accepted, created, lambdaProxy, redirect } from "opiniated-lambda";

export const handler = lambdaProxy(async () => { return created("https://location.com"); });
// Returns CREATED with a Location header

export const handler = lambdaProxy(async () => { return accepted(); });
// Returns ACCEPTED

export const handler = lambdaProxy(async () => { return redirect("https://location.com"); });
// Returns 303 - SEE_OTHER with a Location header

export const handler = lambdaProxy(async () => { return binary(buffer, "image/jpeg"); });
// Returns OK with a binary payload and Content-Type header, base64 encoded for API Gateway.

export const handler = lambdaProxy(async () => { return result(218, { foo: "bar" }, { "X-CUSTOM-HEADER": "foobar" }); });
// Returns a 218 status code with the body serialized.
```

#### Returning an error

Errors must be thrown. They get caught by `lambdaProxy` and returned as custom payload.
If the error is unknown, a 500 - Internal Server Error is returned.

```typescript
import { lambdaProxy, notFoundError } from "opiniated-lambda";

export const handler = lambdaProxy(async () => { throw notFoundError(target); });
// Returns a 404 with custom error payload.

export const handler = lambdaProxy(async () => { throw badRequestError("Error message"); });
// Returns a 400 with custom error payload.

export const handler = lambdaProxy(async () => { throw validationError([validation details]); });
// Returns a 400 with custom error payload.

export const handler = lambdaProxy(async () => { throw new Error("Error message"); });
// Returns a 500 with custom error payload.

export const handler = lambdaProxy(async () => { throw internalServerError("Error message"); });
// Same as above
```

Errors also trigger additional logging that defaults to console.error/CloudWatch.

### Inputs

#### Lambda event & context

To get the default AWS Lambda event and context, declare them as arguments using ES6 object deconstruction:
```typescript
import { lambdaProxy } from "opiniated-lambda";
// e.g. GET /api/{projectId}?from=foo
export const handler = lambdaProxy(async ({ context, event }) => {
  const method = event.httpMethod // The HTTP method.
  ...
});
```

#### Parameters

To retrieve the parameters (either body or query string), use the `parameters<T>()` function.
Parameters from both the path and query string are merged and url decoded.

```typescript
import { lambdaProxy } from "opiniated-lambda";

// Typed interface for parameters
interface HandlerParameters {
  projectId: string;
  from?: string;
}

// e.g. GET /api/{projectId}?from=foo
export const handler = lambdaProxy(async ({ parameters }) => {
  const decodedParams = parameters<HandlerParameters>();

  const projectId = decodedParams.projectId // The decoded project id.
  ...
});
```

#### Body parsing

To get the body parsed as either JSON or FORM (based on request Content-Type), use the `body<T>()` function.

```typescript
import { lambdaProxy } from "opiniated-lambda";

// Typed interface for parameters
interface Client {
  id: string;
  name?: string;
  age: number;
}

// e.g. POST /api/clients
export const handler = lambdaProxy(async ({ body }) => {
  const bodyObj = body<Client>();

  const clientId = bodyObj.id // The client id.
  ...
});
```

#### Input validation

Both parameters and body can be validated by providing a JSON Schema, compatible with [ajv](https://github.com/epoberezkin/ajv)
as options to the `lambdaProxy`:

```typescript
import { lambdaProxy } from "opiniated-lambda";

// Typed interface for parameters
interface Client {
  id: string;
  name?: string;
  age: number;
}

// e.g. POST /api/clients
export const handler = lambdaProxy(
  async ({ body }) => {
    const bodyObj = body<Client>();

    const clientId = bodyObj.id // The client id.
    ...
  },
  {
    validation: {
      body: { // The JSON schema used for body validation
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
          },
          name: {
            type: "string",
            minLength: 3
          },
          age: {
            type: "number",
            minimum: 5
          },
        },
        required: [ "id", "age" ],
      },
      parameters: {...} // Same for parameters
    }
  });
```

If the input is not valid, a validationError is thrown with details about failed validation.
The function is not ran if validation fails.

### Adding CORS headers

CORS headers (`Access-Control-Allow-Origin`) can be automatically appended to all responses using the `cors` option:

```typescript
import { lambdaProxy, ok } from "opiniated-lambda";

// e.g. GET /api/projects
export const handler = lambdaProxy(
  async () => {
    return ok();
  },
  {
    cors: true, // To return Access-Control-Allow-Origin: "*"
    // cors: "https://www.myfantasticwebapp.com" to return Access-Control-Allow-Origin: "https://www.myfantasticwebapp.com"
  });
```

## Using lambdaAuthorizerBearer

Similar to what `lambdaProxy` provides, there is a helper function to create [AWS API Gateway Lambda Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html):

```typescript
import { lambdaAuthorizerBearer } from "opiniated-lambda";

// e.g. GET /api/projects
export const handler = lambdaAuthorizerBearer(
  async ({ bearerToken, baseApiGatewayArn }) => {

    // bearerToken contains the authorization header minus the bearer prefix
    // baseApiGatewayArn is the ARN for the API Gateway, including the stage.

    // Performs authentication/authorization here...

    return { // Authorizer policy.
      policyDocument: {
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: `${baseApiGatewayArn}/*`, // e.g. for all endpoints in the API.
          },
        ],
        Version: "2012-10-17",
      },
      principalId: "...",
    };
  });
```

## Using lambda

Simple lambda function (not bound to events) can be handled with the `lambda` helper:

```typescript
import { lambda } from "opiniated-lambda";

interface MyEvent {
  id: string;
}

// e.g. GET /api/projects
export const handler = lambda<MyEvent>(
  async ({ event }) => {

    const id = event.id;
    
    // Process..
  },
  {
    validation: {
      event: {} // As for lambdaProxy, a JSON Schema can be provided to validate the event.
    }
  });
```

# Health checks

It is recommended to create a health checking endpoint in every API created. This allows for a quick diagnosing and monitoring
of problems in production.
Health checks can validate anything, but you probably want to:
- check that dependencies are ok (connection with database, remote APIs, etc...)
- check that some configuration parameters are within some boundaries (size of authentication signing keys, etc.)

Here is a summary example on how to implement health checks:

In an example service class:

```typescript
import { checkHealth, HealthCheckResult, ICheckHealth } from "opiniated-lambda";

export class MyService implements ICheckHealth {

  // This is the sweet & short version.
  // Returning HealthCheckResult directly offers more options if needed.
  public async checkHealth(): Promise<HealthCheckResult> {
    return checkHealth(
      "health check name",
      "target",
      async () => { check the health, throw an error if there is a problem });
  }

}

```

Health check lambda handler:

```typescript
import { HealthChecker, lambdaProxy } from "opiniated-lambda";

const healthChecker = new HealthChecker(
  {
    includeTargets: true,
    name: "My API name"
  },
  [ new MyService(), ...]); // List of all ICheckHealth to run.

// GET /health
export const handler = lambdaProxy(async () => healthChecker.checkHealth(), { cors: true });
```

# Configuration service

It is recommended to isolate and regroup all configuration variables for a given application behind an interface.
Additionnaly, returning configuration values as `Promise` allows for greater flexibility when it comes to initialization and sources.

This framework optionaly provide definition and support for this pattern.

## Configuration service interface

The framework provides an interface to define what a configuration service could look like:
```typescript
export interface ConfigService {
  get(key: string): Promise<string>;
  get(key: string, required?: boolean): Promise<string | undefined>;
}
```

Usage:
```typescript

const service: ConfigService;

// this one will throw a configuration error if the key external-service-url is not defined.
const urlForExternalService = await service.get("external-service-url");

// This one makes it an optional value
const optionalUrlForExternalService = await service.get("external-service-url", false);

```

## Provided implementation

3 implementations for the ConfigService are provided.

### StaticConfigService

The simplest one, useful for unit testing, simply provides values defined in its constructor.

```typescript
const configService = new StaticConfigService({
  foo: "bar"
});

const foo = await configService.get("foo");
```

### ProcessEnvConfigService

The `ProcessEnvConfigService` implementation provides values defined as environment variables.

```bash
export foo=bar // on Linux
set foo=bar // on Windows
```

```typescript
const configService = new ProcessEnvConfigService();

const foo = await configService.get("foo");
```

### SSMParameterStoreConfigService

The `SSMParameterStoreConfigService` retrieves configuration variables from [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-paramstore.html)
Keys can be defined under a common path.
They are retrieved in batch, and cached locally.

```typescript
const configService = new SSMParameterStoreConfigService({
  path: "/my-service-path/env",
  ttl: 15*60*1000 // The cache duration in ms. By default, they are cached indefinitely.
});

// The following retrieves the String value located at /my-service-path/env/foo.
const foo = await configService.get("foo");
```

Do not forget to add the necessary permissions to your service to access the Parameter Store.
Example IAM Policy:
```YAML
Effect: "Allow"
Action:
  - "ssm:GetParameterHistory" # This one must be provided, otherwise AWS will deny the GetParametersByPath call as well.
  - "ssm:GetParametersByPath"
Resource:
  - "Fn::Join":
      - ":"
      - - "arn"
        - Ref: "AWS::Partition"
        - "ssm"
        - Ref: "AWS::Region"
        - Ref: "AWS::AccountId"
        - "parameter/my-service-path/env/*" # Set correct path here.
```

# Dependency errors

In addition to the health check endpoint, it is often advisable to return specific error classes when an error
occurs in a downstream dependency, as opposed to the internal code of the API (e.g. a downstream server is down).

There is a facility included for that:

```typescript
import { dependencyErrorProxy, lambdaProxy } from "opiniated-lambda";

export class MyService {
  // ... all downstream definitions
}

const serviceInstance = dependencyErrorProxy(new MyService(), "serviceName");
// From now on, all errors (sync and async) coming back from MyService will be encapsulated in a dependencyError.

export const handler = lambdaProxy(async () => serviceInstance.methodThatReturnsAnError(), { cors: true });
// The response will look like the following:
{
  body: {
    error: {
      code: "dependencyError",
      details: "<error details>",
      message: "error.message property",
      target: "serviceName"
    }
  }
  statusCode: 502 // Bad Gateway
}
```

if you do not wish to use a `Proxy`, it is possible to throw `dependencyError` manually:
```typescript
import { dependencyError } from "opiniated-lambda";

throw dependencyError(target, error, message);
```

Additionaly, if you enable [Typescript decorators support](http://www.typescriptlang.org/docs/handbook/decorators.html),
you can just decorate your target classes with the `@dependency` decorator:

```typescript
import { dependency, lambdaProxy } from "opiniated-lambda";

@dependency
export class MyService {
  // ... all downstream definitions
}

// The decorator automatically encapsulate the service in the dependency proxy.
const serviceInstance = new MyService();
// From now on, all errors (sync and async) coming back from MyService will be encapsulated in a dependencyError.

export const handler = lambdaProxy(async () => serviceInstance.methodThatReturnsAnError(), { cors: true });
// The response will look like the following:
{
  body: {
    error: {
      code: "dependencyError",
      details: "<error details>",
      message: "error.message property",
      target: "serviceName"
    }
  }
  statusCode: 502 // Bad Gateway
}
```

# Warmup support

This is primarily to support warmup for lambda function (using e.g. [serverless-plugin-warmup](https://github.com/FidelLimited/serverless-plugin-warmup)).

It is possible to provide a function to be evaluated to shortcut the execution in case of warmup.

```typescript
import { lambdaProxy } from "opiniated-lambda";

export const handler = lambdaProxy(
  async () => ({ foo: "bar" }),
  {
    isWarmup: (e) => e["source"] === "serverless-plugin-warmup" // if event.source === "serverless-plugin-warmup", validation & execution will not occur.
  });
```

# Customization

*Some* level of customization is available.

## Custom results

All results are processed by calling the `getAPIGatewayProxyResult` method defined on the `APIGatewayProxyResultProvider` interface.
Returning a custom result can be done using the following method:

```typescript
import { APIGatewayProxyResult } from "aws-lambda";
import { APIGatewayProxyResultProvider, BodySerializer, lambdaProxy } from "opiniated-lambda";

export class MyCustomResult implements APIGatewayProxyResultProvider {

  public constructor(...) {
  }

  /**
   * Converts to {APIGatewayProxyResult}
   */
  public getAPIGatewayProxyResult(serializer: BodySerializer): APIGatewayProxyResult {
    return {
      body: serializer({custom body}),
      headers: { ...headers...},
      statusCode: 419,
    };
  }
}

export const handler = lambdaProxy(async () => { return new MyCustomResult(...); });
```

## Custom errors

As with results, any error that implements the `getAPIGatewayProxyResult` will get interpreted as well.
It is advised to not subclass the default Error object, but augment it. Using the provided `buildError` function will help create it.

```typescript
import { buildError, lambdaProxy } from "opiniated-lambda";

export const myCustomError = (message: string) =>
  buildError(
    {
      code: "myCustomError",
      message,
    },
    589); // HTTP Status code.

export const handler = lambdaProxy(async () => { throw myCustomError("message"); });
```

## Customizing error logging

All `lambda` functions accept a `errorLogger` option that will be used if passed (to use a custom error logger).

## Customizing body parsing and serializing

`bodySerializer` and `bodyParser` options are also available to replace the default behavior.