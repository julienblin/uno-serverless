import * as Ajv from "ajv";
// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { parse as parseQS } from "querystring";
import { badRequestError, ErrorData, internalServerError, notFoundError, validationError } from "./errors";
import { BodySerializer, isAPIGatewayProxyResultProvider, ok } from "./results";
import { defaultConfidentialityReplacer, memoize } from "./utils";

export interface LambdaProxyFunctionArgs {
  /** The Lambda Context */
  context: lambda.Context;

  /** The Lambda Event */
  event: lambda.APIGatewayEvent;

  /** The body parsed as an object, either JSON or FORM. */
  body<T>(): T | undefined;

  /** The normalized headers, with all keys lower-cased. */
  headers(): Record<string, string>;

  /** The path & query string parameters, decoded. */
  parameters<T>(): T;
}

export type LambdaProxyFunction =
  (args: LambdaProxyFunctionArgs) => Promise<object | undefined>;

export interface LambdaProxyError {
  context: lambda.Context;
  error: any;
  event: lambda.APIGatewayEvent;
  result?: lambda.APIGatewayProxyResult;
}

export interface LambdaProxyValidationOptions {
  /**
   * Will validate the body based on the schema.
   */
  body?: {};

  /**
   * Will validate the parameters (both path & QS) as an object.
   */
  parameters?: {};
}

export interface LambdaProxyOptions {
  /**
   * The serializer to use for the body.
   */
  bodySerializer?: BodySerializer;

  /**
   * If true, adds Access-Control-Allow-Origin: * to the response headers
   * If a string, set the Access-Control-Allow-Origin to the string value.
   */
  cors?: boolean | string;

  /**
   * Validation options. Will run before the function.
   */
  validation?: LambdaProxyValidationOptions;

  /**
   * The custom error logger to use.
   * If not provided, will use console.error.
   */
  errorLogger?(lambdaProxyError: LambdaProxyError): void | Promise<void>;
}

const defaultBodySerializer: BodySerializer = (body?: any) => body ? JSON.stringify(body) : "";

/**
 * Parses the body of a request. Form or JSON.
 */
const parseBody = <T>(event: lambda.APIGatewayProxyEvent, headers: () => Record<string, string>): T | undefined => {
  if (event.httpMethod === "GET") {
    return undefined;
  }

  if (!event.body) {
    return undefined;
  }

  let contentType = headers()["content-type"];
  if (!contentType) {
    contentType = "application/json";
  }

  switch (contentType) {
    case "application/json":
    case "text/json":
      try {
        return JSON.parse(event.body) as T;
      } catch (jsonParseError) {
        throw badRequestError(jsonParseError.message);
      }

    case "application/x-www-form-urlencoded":
      try {
        return parseQS<T>(event.body);
      } catch (formParseError) {
        throw badRequestError(formParseError.message);
      }

    default:
      throw badRequestError(`Unrecognized content-type: ${contentType}.`);
  }
};

const decodeFromSource = (source: { [name: string]: string }, params: any) => {
  for (const prop in source) {
    if (source.hasOwnProperty(prop)) {
      params[prop] = decodeURIComponent(source[prop]);
    }
  }
};

const decodeParameters = <T>(event: lambda.APIGatewayProxyEvent): T => {
  const params: any = {};

  if (event.pathParameters) {
    decodeFromSource(event.pathParameters, params);
  }

  if (event.queryStringParameters) {
    decodeFromSource(event.queryStringParameters, params);
  }

  return params as T;
};

const normalizeHeaders = (event: lambda.APIGatewayProxyEvent): Record<string, string> => {
  const normalizedHeaders = {};

  if (!event.headers) {
    return normalizedHeaders;
  }

  const headerKeys = Object.keys(event.headers);
  for (const key of headerKeys) {
    normalizedHeaders[key.toLowerCase()] = event.headers[key];
  }

  return normalizedHeaders;
};

const defaultErrorLogger = async (lambdaProxyError: LambdaProxyError) => {

  let parsedBody;

  if (lambdaProxyError.event.body) {
    try {
      parsedBody = parseBody(lambdaProxyError.event, () => normalizeHeaders(lambdaProxyError.event));
    } catch (parseError) {
      parsedBody = parseError.stack;
    }
  }

  const payload = {
    error: lambdaProxyError.error.toString(),
    errorStackTrace: lambdaProxyError.error.stack,
    headers: lambdaProxyError.event.headers,
    httpMethod: lambdaProxyError.event.httpMethod,
    parsedBody,
    path: lambdaProxyError.event.path,
    requestContext: lambdaProxyError.event.requestContext,
    response: lambdaProxyError.result,
  };

  const JSON_STRINGIFY_SPACE = 2;

  console.error(JSON.stringify(payload, defaultConfidentialityReplacer, JSON_STRINGIFY_SPACE));
};

const ajv = new Ajv({
  allErrors: true,
});

const validate = (
  body: <T>() => T | undefined,
  parameters: <T>() => T,
  validationOptions?: LambdaProxyValidationOptions) => {

  if (!validationOptions) {
    return;
  }

  const validationErrors: ErrorData[] = [];

  if (validationOptions.parameters) {
    const parametersAsObject = parameters();
    if (!ajv.validate(validationOptions.parameters, parametersAsObject) && ajv.errors) {
      ajv.errors.forEach((e) => {
        const target = e.dataPath.startsWith(".") ? e.dataPath.substring(1) : e.dataPath;
        validationErrors.push({
          code: e.keyword,
          data: e.params,
          message: e.message ? e.message : "unknown error",
          target: target ? target : "parameters",
        });
      });
    }
  }

  if (validationOptions.body) {
    const bodyAsObject = body();

    if (!bodyAsObject) {
      validationErrors.push({ code: "required", message: "Missing body", target: "body" });
    }

    if (!ajv.validate(validationOptions.body, bodyAsObject) && ajv.errors) {
      ajv.errors.forEach((e) => {
        const target = e.dataPath.startsWith(".") ? e.dataPath.substring(1) : e.dataPath;
        validationErrors.push({
          code: e.keyword,
          data: e.params,
          message: e.message ? e.message : "unknown error",
          target: target ? target : "body",
        });
      });
    }
  }

  if (validationErrors.length > 0) {
    throw validationError(validationErrors);
  }
};

/**
 * Creates a wrapper for a Lambda function bound to API Gateway using PROXY.
 * @param func - The function to wrap.
 * @param options - various options.
 */
export const lambdaProxy =
  (func: LambdaProxyFunction, options: LambdaProxyOptions = {}): lambda.APIGatewayProxyHandler =>
    async (event: lambda.APIGatewayProxyEvent, context: lambda.Context, callback: lambda.ProxyCallback)
      : Promise<lambda.APIGatewayProxyResult> => {

      let proxyResult: lambda.APIGatewayProxyResult | undefined;
      if (!options.bodySerializer) {
        options.bodySerializer = defaultBodySerializer;
      }

      try {

        const memoizedNormalizeHeaders = memoize(() => normalizeHeaders(event)) as () => Record<string, string>;
        const memoizedParseBody = memoize(() => parseBody(event, memoizedNormalizeHeaders)) as <T>() => T | undefined;
        const memoizedParameters = memoize(() => decodeParameters(event)) as <T>() => T;

        validate(memoizedParseBody, memoizedParameters, options.validation);

        const funcResult = await func({
          body: memoizedParseBody,
          context,
          event,
          headers: memoizedNormalizeHeaders,
          parameters: memoizedParameters,
        });

        if (funcResult) {
          proxyResult = funcResult && isAPIGatewayProxyResultProvider(funcResult)
          ? funcResult.getAPIGatewayProxyResult(options.bodySerializer)
          : ok(funcResult).getAPIGatewayProxyResult(options.bodySerializer);
        } else {
          proxyResult = notFoundError(event.path).getAPIGatewayProxyResult(options.bodySerializer);
        }

      } catch (error) {
        proxyResult = isAPIGatewayProxyResultProvider(error)
          ? error.getAPIGatewayProxyResult(options.bodySerializer)
          : internalServerError(
              error.message ? error.message : error.toString()).getAPIGatewayProxyResult(options.bodySerializer);

        if (!options.errorLogger) {
          options.errorLogger = defaultErrorLogger;
        }

        try {
          const loggerPromise = options.errorLogger({ event, context, error, result: proxyResult });
          if (loggerPromise) {
            await loggerPromise;
          }
        } catch (loggerError) {
          console.error(loggerError);
        }
      }

      if (!proxyResult) {
        throw new Error("Internal error in createLambdaProxy - proxyResult should not be null.");
      }

      if (options.cors) {
        proxyResult.headers = {
          ...proxyResult.headers,
          "Access-Control-Allow-Origin": typeof(options.cors) === "string" ? options.cors : "*",
        };
      }

      return proxyResult;
    };
