import * as Ajv from "ajv";
// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { parse as parseQS } from "querystring";
import { BadRequestError, InternalServerError, NotFoundError, ValidationDiagnostic, ValidationError } from "./errors";
import { isAPIGatewayProxyResultProvider, OKResult } from "./results";
import { defaultConfidentialityReplacer } from "./utils";

export interface LambdaProxyFunctionArgs {
  context: lambda.Context;
  event: lambda.APIGatewayEvent;
  parseBody<T>(): T | undefined;
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
  bodySchema?: {};
}

export interface LambdaProxyOptions {
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

/**
 * Parses the body of a request. Form or JSON.
 */
const parseBody = <T>(event: lambda.APIGatewayProxyEvent): T | undefined => {
  if (event.httpMethod === "GET") {
    return undefined;
  }

  if (!event.body) {
    return undefined;
  }

  let contentType: string | undefined;

  if (event.headers) {
    if (event.headers["Content-Type"]) {
      contentType = event.headers["Content-Type"].toLowerCase();
    } else {
      if (event.headers["content-type"]) {
        contentType = event.headers["content-type"].toLowerCase();
      }
    }
  }

  if (!contentType) {
    contentType = "application/json";
  }

  switch (contentType) {
    case "application/json":
    case "text/json":
      try {
        return JSON.parse(event.body) as T;
      } catch (jsonParseError) {
        throw new BadRequestError(jsonParseError.message);
      }

    case "application/x-www-form-urlencoded":
      try {
        return parseQS<T>(event.body);
      } catch (formParseError) {
        throw new BadRequestError(formParseError.message);
      }

    default:
      throw new BadRequestError(`Unrecognized content-type: ${contentType}.`);
  }
};

const defaultErrorLogger = async (lambdaProxyError: LambdaProxyError) => {

  let parsedBody;

  if (lambdaProxyError.event.body) {
    try {
      parsedBody = parseBody(lambdaProxyError.event);
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

const validate = (event: lambda.APIGatewayProxyEvent, validationOptions?: LambdaProxyValidationOptions) => {
  if (!validationOptions) {
    return;
  }

  const validationErrors: ValidationDiagnostic[] = [];

  if (validationOptions.bodySchema) {
    const bodyAsObject = parseBody(event);

    if (!bodyAsObject) {
      validationErrors.push({ code: "required", message: "Missing body", target: "body" });
    }

    if (!ajv.validate(validationOptions.bodySchema, bodyAsObject) && ajv.errors) {
      ajv.errors.forEach((e) => {
        validationErrors.push({
          code: e.keyword,
          message: e.message ? e.message : "unknown error",
          target: e.dataPath.startsWith(".") ? e.dataPath.substring(1) : e.dataPath,
        });
      });
    }
  }

  if (validationErrors.length > 0) {
    throw new ValidationError(validationErrors);
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

      try {

        validate(event, options.validation);

        const funcResult = await func({
          context,
          event,
          parseBody: () => parseBody(event),
        });

        if (funcResult) {
          proxyResult = funcResult && isAPIGatewayProxyResultProvider(funcResult)
          ? funcResult.getAPIGatewayProxyResult()
          : new OKResult(funcResult).getAPIGatewayProxyResult();
        } else {
          proxyResult = new NotFoundError(event.path).getAPIGatewayProxyResult();
        }

      } catch (error) {
        proxyResult = isAPIGatewayProxyResultProvider(error)
          ? error.getAPIGatewayProxyResult()
          : new InternalServerError(error.message ? error.message : error.toString()).getAPIGatewayProxyResult();

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
