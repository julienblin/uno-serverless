import { expect } from "chai";
import { uno } from "../../../src/core/builder";
import { awsLambdaAdapter } from "../../../src/core/builder-aws";
import { randomStr } from "../../../src/core/utils";
import { authorizerBearer } from "../../../src/handlers/authorizer";
import { createLambdaContext } from "../lambda-helper-test";

describe("authorizerBearer handler", () => {

  it("should parse bearerToken", async () => {

    const authorizerResult = (bearerToken: string) => ({
      policyDocument: {
        Statement: [],
        Version: "2012-10-17",
      },
      principalId: bearerToken,
    });

    const inputBearerToken = randomStr();

    const handler = uno(awsLambdaAdapter())
      .handler(authorizerBearer(async ({ bearerToken }) => authorizerResult(bearerToken)));

    const lambdaResult = await handler(
      {
        authorizationToken: `bearer ${inputBearerToken}`,
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => { });

    expect(lambdaResult.principalId).equal(inputBearerToken);
  });

  it("should throw if no bearer token", async () => {

    const authorizerResult = (bearerToken: string) => ({
      policyDocument: {
        Statement: [],
        Version: "2012-10-17",
      },
      principalId: bearerToken,
    });

    const handler = uno(awsLambdaAdapter())
      .handler(authorizerBearer(async ({ bearerToken }) => authorizerResult(bearerToken)));

    try {
      await handler(
        {
          authorizationToken: "",
          methodArn: randomStr(),
          type: randomStr(),
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("unauthorized");
    }
  });

});
