// tslint:disable-next-line:no-implicit-dependencies
import * as lambda from "aws-lambda";

export interface LambdaAuthorizerBearerFunctionArgs {
  bearerToken?: string;
  context: lambda.Context;
  event: lambda.CustomAuthorizerEvent;
}

export type LambdaAuthorizerBearerFunction =
  (args: LambdaAuthorizerBearerFunctionArgs) => Promise<lambda.CustomAuthorizerResult>;

/**
 * Creates a wrapper for a Lambda authorizer function for a bearer token.
 * @param func - The function to wrap.
 */
export const lambdaAuthorizerBearer =
  (func: LambdaAuthorizerBearerFunction): lambda.CustomAuthorizerHandler =>
    async (event: lambda.CustomAuthorizerEvent, context: lambda.Context, callback: lambda.CustomAuthorizerCallback)
    : Promise<lambda.CustomAuthorizerResult> => {

      const bearerToken = event.authorizationToken
        ? event.authorizationToken.replace(/\s*bearer\s*/ig, "")
        : undefined;

      return func({
          bearerToken,
          context,
          event,
        });
    };
