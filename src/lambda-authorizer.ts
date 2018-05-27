// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";
import { defaultConfidentialityReplacer, safeJSONStringify } from "./utils";

export interface LambdaAuthorizerBearerFunctionArgs {
  /**
   * The base arn for ApiGateway, including the stage.
   * Useful for building policies.
   */
  baseApiGatewayArn: string;

  /**
   * The authorization header minus the bearer prefix.
   */
  bearerToken?: string;

  context: lambda.Context;
  event: lambda.CustomAuthorizerEvent;

  /** The Api Gateway stage */
  stage: string;
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
    context: error.context,
    error: error.error,
    errorStackTrace: error.error.stack,
    event: error.event,
  };

  const JSON_STRINGIFY_SPACE = 2;

  console.error(safeJSONStringify(payload, defaultConfidentialityReplacer, JSON_STRINGIFY_SPACE));
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

      const splitMethodArn = event.methodArn.split("/");

      try {
        return await func({
          baseApiGatewayArn: `${splitMethodArn[0]}/${splitMethodArn[1]}`,
          bearerToken,
          context,
          event,
          stage: splitMethodArn[1],
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
