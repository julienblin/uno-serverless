// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { defaultConfidentialityReplacer } from "./utils";

export interface LambdaAuthorizerBearerFunctionArgs {
  bearerToken?: string;
  context: lambda.Context;
  event: lambda.CustomAuthorizerEvent;
}

export type LambdaAuthorizerBearerFunction =
  (args: LambdaAuthorizerBearerFunctionArgs) => Promise<lambda.CustomAuthorizerResult>;

export interface LambdaAuthorizerBearerError {
  context: lambda.Context;
  error: any;
  event: lambda.CustomAuthorizerEvent;
}

export interface LambdaAuthorizerBearerOptions {
  /**
   * The custom error logger to use.
   * If not provided, will use console.error.
   */
  errorLogger?(error: LambdaAuthorizerBearerError): void | Promise<void>;
}

const defaultErrorLogger = async (error: LambdaAuthorizerBearerError) => {

  const payload = {
    authorizationToken: error.event.authorizationToken,
    error: error.error.toString(),
    errorStackTrace: error.error.stack,
    headers: error.event.headers,
    requestContext: error.event.requestContext,
  };

  const JSON_STRINGIFY_SPACE = 2;

  console.error(JSON.stringify(payload, defaultConfidentialityReplacer, JSON_STRINGIFY_SPACE));
};

/**
 * Creates a wrapper for a Lambda authorizer function for a bearer token.
 * @param func - The function to wrap.
 */
export const lambdaAuthorizerBearer =
  (func: LambdaAuthorizerBearerFunction, options: LambdaAuthorizerBearerOptions = {}): lambda.CustomAuthorizerHandler =>
    async (event: lambda.CustomAuthorizerEvent, context: lambda.Context, callback: lambda.CustomAuthorizerCallback)
    : Promise<lambda.CustomAuthorizerResult> => {

      const bearerToken = event.authorizationToken
        ? event.authorizationToken.replace(/\s*bearer\s*/ig, "")
        : undefined;

      try {
        return await func({
          bearerToken,
          context,
          event,
        });
      } catch (error) {
        if (!options.errorLogger) {
          options.errorLogger = defaultErrorLogger;
        }

        try {
          const loggerPromise = options.errorLogger({ event, context, error });
          if (loggerPromise) {
            await loggerPromise;
          }
        } catch (loggerError) {
          console.error(loggerError);
        }

        throw error;
      }
    };
