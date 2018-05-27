// tslint:disable-next-line:no-implicit-dependencies
import * as awsLambda from "aws-lambda";
import { validationError } from "./errors";
import { defaultConfidentialityReplacer } from "./utils";
import { validate } from "./validator";

export interface LambdaFunctionArgs<T> {
  /** The Lambda Context */
  context: awsLambda.Context;
  /** The Lambda Event */
  event: T;
}

export interface LambdaError {
  context: awsLambda.Context;
  error: any;
  event: any;
}

export interface LambdaOptions {

  /**
   * Validation options. Will run before the function.
   */
  validation?: {

    /**
     * Will validate the event based on the schema.
     */
    event?: {};
  };

  /**
   * The custom error logger to use.
   * If not provided, will use console.error.
   */
  errorLogger?(error: LambdaError): void | Promise<void>;
}

const defaultErrorLogger = async (error: LambdaError) => {

  const payload = {
    error: error.error,
    errorStackTrace: error.error.stack,
    event: error.event,
    requestContext: error.event.requestContext,
  };

  const JSON_STRINGIFY_SPACE = 2;

  console.error(JSON.stringify(payload, defaultConfidentialityReplacer, JSON_STRINGIFY_SPACE));
};

export type LambdaFunction<T> =
  (args: LambdaFunctionArgs<T>) => Promise<any>;

/**
 * Creates a wrapper for a simple invocation Lambda function.
 * @param func - The function to wrap.
 * @param options - various options.
 */
export const lambda = <T>(func: LambdaFunction<T>, options: LambdaOptions = {}): awsLambda.Handler<T> =>
  async (event: T, context: awsLambda.Context, callback: awsLambda.Callback)
  : Promise<any> => {
    try {

      if (options.validation && options.validation.event) {
        const validationErrors = validate(options.validation.event, event, "event");
        if (validationErrors.length > 0) {
          throw validationError(validationErrors);
        }
      }

      return await func({
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
