# opiniated-lambda

Provides an opiniated framework for creating API using AWS Serverless stack (API Gateway/Lambda) on Node 8 / TypeScript.
This framework makes some choices and imposes some conventions. If you require a lot flexibility, there are probably better options.

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
    "target": "<and indication for the target of an error, e.g. backend API name or property name for validation>",
    "details": [
      // Additional errors details in hierarchies
    ],
    "data": "Any additional data if necessary."
  }
}
```
- Provides additional facilities for validating input using JSON schema (using [ajv](https://github.com/epoberezkin/ajv)) & returning CORS headers
- Provides a framework for exposing a health check endpoint

# Getting started

## Prerequisites
- An API Gateway / Lambda solution using Node 8. We recommend using [serverless](https://serverless.com/).

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

export const handler = lambdaProxy(async () => { throw validationError([validationdetails]); });
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
// e.g. GET /api/{projectId}?from=somevalue
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

// e.g. GET /api/{projectId}?from=somevalue
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

// e.g. GET /api/{projectId}?from=somevalue
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

// e.g. GET /api/{projectId}?from=somevalue
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

// e.g. GET /api/{projectId}?from=somevalue
export const handler = lambdaProxy(
  async () => {
    return ok();
  },
  {
    cors: true, // To return Access-Control-Allow-Origin: "*"
    // cors: "https://www.myfantasticwebapp.com" to return Access-Control-Allow-Origin: "https://www.myfantasticwebapp.com"
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

if you do not which to use a `Proxy`, it is possible to throw `dependencyError` manually:
```typescript
import { dependencyError } from "opiniated-lambda";

throw dependencyError(target, error, message);
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