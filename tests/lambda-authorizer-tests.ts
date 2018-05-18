// tslint:disable-next-line:no-implicit-dependencies
import { CustomAuthorizerResult } from "aws-lambda";
import { expect } from "chai";
import { describe, it } from "mocha";
import { lambdaAuthorizerBearer } from "../src/lambda-authorizer";
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

});
