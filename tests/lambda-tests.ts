// tslint:disable-next-line:no-implicit-dependencies
import { CustomAuthorizerResult } from "aws-lambda";
import { expect } from "chai";
import { describe, it } from "mocha";
import { lambda, LambdaError } from "../src/lambda";
import { createLambdaContext, randomStr } from "./lambda-helper-tests";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion
// tslint:disable:no-empty

describe("lambda", () => {

  it("should execute .", async () => {
    let executed = true;
    const lambdaHandler = lambda<any>(async ({ event, context }) => { executed = true; });

    const lambdaResult = await lambdaHandler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(executed).is.true;
  });

  it("should handle errors", async () => {
    const errorMessage = "This is an error.";
    let loggedLambdaError: LambdaError | undefined;

    const lambdaHandler = lambda(
      async () => { throw new Error(errorMessage); },
      {
        errorLogger: (lambdaError) => { loggedLambdaError = lambdaError; },
      });

    try {
      await lambdaHandler(
        {},
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
