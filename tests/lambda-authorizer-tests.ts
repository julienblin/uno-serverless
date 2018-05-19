// tslint:disable-next-line:no-implicit-dependencies
import { CustomAuthorizerResult } from "aws-lambda";
import { expect } from "chai";
import { describe, it } from "mocha";
import { lambdaAuthorizerBearer, LambdaAuthorizerBearerError } from "../src/lambda-authorizer";
import { createLambdaContext, randomStr } from "./lambda-helper-tests";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-empty

describe("lambdaAuthorizerBearer", () => {

  it("should execute authorizer and extract bearerToken.", async () => {

    const authorizerResult = (bearerToken: string): CustomAuthorizerResult => ({
      policyDocument: {
        Statement: [],
        Version: "2012-10-17",
      },
      principalId: bearerToken,
    });

    const inputBearerToken = "a987sfasd785sadf876";
    const lambda = lambdaAuthorizerBearer(async ({ bearerToken, event, context }) => authorizerResult(bearerToken!));

    const lambdaResult = await lambda(
      {
        authorizationToken: `bearer ${inputBearerToken}`,
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {}) as CustomAuthorizerResult;

    expect(lambdaResult.principalId).equal(inputBearerToken);
  });

  it("should handle errors", async () => {
    const inputBearerToken = "a987sfasd785sadf876";
    const errorMessage = "This is an error.";
    let loggedLambdaError: LambdaAuthorizerBearerError | undefined;

    const lambda = lambdaAuthorizerBearer(
      async () => { throw new Error(errorMessage); },
      {
        errorLogger: (lambdaError) => { loggedLambdaError = lambdaError; },
      });

    try {
      await lambda(
        {
          authorizationToken: `bearer ${inputBearerToken}`,
          methodArn: randomStr(),
          type: randomStr(),
        },
        createLambdaContext(),
        (e, r) => {});

      expect(false);
    } catch (error) {
      expect(loggedLambdaError).not.be.undefined;
      expect(loggedLambdaError!.event).to.not.be.undefined;
      expect(loggedLambdaError!.context).to.not.be.undefined;
      expect(loggedLambdaError!.error.message).to.equal(errorMessage);
    }
  });

});
