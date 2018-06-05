// tslint:disable-next-line:no-implicit-dependencies
import { CustomAuthorizerResult } from "aws-lambda";
import { expect } from "chai";
import { describe, it } from "mocha";
import { createContainerFactory } from "../src/container";
import {
  containerLambdaAuthorizerBearer, lambdaAuthorizerBearer,
  LambdaAuthorizerBearerError } from "../src/lambda-authorizer";
import { randomStr } from "../src/utils";
import { createLambdaContext } from "./lambda-helper-test";

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

    const inputBearerToken = randomStr();
    const lambda = lambdaAuthorizerBearer(async ({ bearerToken }) => authorizerResult(bearerToken!));

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

  it("should parse API Gateway ARN.", async () => {

    const authorizerResult: CustomAuthorizerResult = {
      policyDocument: {
        Statement: [],
        Version: "2012-10-17",
      },
      principalId: "foo",
    };

    const apiGatewayApiArn = `arn:${randomStr()}`;
    const apiGatewayStage =  randomStr();
    const lambda = lambdaAuthorizerBearer(
      async ({ baseApiGatewayArn, event, context, stage }) => {
        expect(baseApiGatewayArn).to.equal(`${apiGatewayApiArn}/${apiGatewayStage}`);
        expect(stage).to.equal(apiGatewayStage);

        return authorizerResult;
      });

    const lambdaResult = await lambda(
      {
        authorizationToken: `bearer ${randomStr()}`,
        methodArn: `${apiGatewayApiArn}/${apiGatewayStage}/${randomStr()}`,
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {}) as CustomAuthorizerResult;

    expect(lambdaResult).equal(authorizerResult);
  });

  it("should handle errors", async () => {
    const inputBearerToken = randomStr();
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

  it("should manage and inject container.", async () => {

    interface ContainerContract {
      a(): string;
      b(): string;
      c(): string;
    }

    // tslint:disable:no-unnecessary-callback-wrapper
    const createContainer = createContainerFactory<ContainerContract>({
      a: () => randomStr(),
      b: ({ builder }) => builder.transient(randomStr()),
      c: ({ builder }) => builder.scoped(randomStr()),
    });

    const authorizerResult = (values: any): CustomAuthorizerResult => ({
      policyDocument: {
        Statement: [],
        Version: "2012-10-17",
      },
      principalId: JSON.stringify(values),
    });

    const lambda = containerLambdaAuthorizerBearer<ContainerContract>(
      async ({}, { a, b, c }) => authorizerResult({
        scoped1: c(),
        scoped2: c(),
        singleton: a(),
        transient1: b(),
        transient2: b(),
      }),
      {
        containerFactory: () => createContainer(),
      });

    const lambdaResult1 = await lambda(
      {
        authorizationToken: randomStr(),
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {}) as CustomAuthorizerResult;

    const parsedPrincipalId1 = JSON.parse(lambdaResult1.principalId);

    const lambdaResult2 = await lambda(
      {
        authorizationToken: randomStr(),
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {}) as CustomAuthorizerResult;

    const parsedPrincipalId2 = JSON.parse(lambdaResult2.principalId);

    expect(parsedPrincipalId1.singleton).to.be.equal(parsedPrincipalId2.singleton);
    expect(parsedPrincipalId1.scoped1).to.not.equal(parsedPrincipalId2.scoped1);
    expect(parsedPrincipalId1.transient1).to.not.equal(parsedPrincipalId2.transient1);

    expect(parsedPrincipalId1.scoped1).to.be.equal(parsedPrincipalId1.scoped2);
    expect(parsedPrincipalId2.scoped1).to.be.equal(parsedPrincipalId2.scoped2);
    expect(parsedPrincipalId1.transient1).to.not.equal(parsedPrincipalId1.transient2);
  });

});
