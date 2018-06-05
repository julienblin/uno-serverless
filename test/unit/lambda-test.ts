import { expect } from "chai";
import { describe, it } from "mocha";
import { createContainerFactory } from "../../src/container";
import { containerLambda, lambda, LambdaError } from "../../src/lambda";
import { randomStr } from "../../src/utils";
import { createLambdaContext } from "./lambda-helper-test";

describe("lambda", () => {

  it("should execute function", async () => {
    let executed = false;
    const lambdaHandler = lambda<any>(async ({ event, context }) => { executed = true; });

    await lambdaHandler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(executed).is.true;
  });

  it("should execute validate event", async () => {
    let executed = false;
    const lambdaHandler = lambda<any>(
      async ({ event, context }) => { executed = true; },
      {
        errorLogger: () => {},
        validation: {
          event: {
            properties: {
              bar: {
                type: "string",
              },
              foo: {
                type: "number",
              },
            },
            required: [ "bar" ],
          },
        },
      });

    try {
      await lambdaHandler(
        {
          foo: randomStr(),
        },
        createLambdaContext(),
        (e, r) => {});
      expect(false);
    } catch (error) {
      expect(executed).is.false;
      expect(error.code).to.equal("validationError");
    }
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

  it("should manage and inject container.", async () => {

    interface ContainerContract {
      a(): string;
      b(): string;
      c(): string;
    }

    const createContainer = createContainerFactory<ContainerContract>({
      a: () => randomStr(),
      b: ({ builder }) => builder.transient(randomStr()),
      c: ({ builder }) => builder.scoped(randomStr()),
    });

    let collected: any;

    const lambdaHandler = containerLambda<any, ContainerContract>(
      async ({ event, context }, { a, b, c}) => {
        collected = {
          scoped1: c(),
          scoped2: c(),
          singleton: a(),
          transient1: b(),
          transient2: b(),
        }; },
      {
        containerFactory: () => createContainer(),
      });

    await lambdaHandler(
      {
        authorizationToken: randomStr(),
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {});

    const collected1 = collected;

    await lambdaHandler(
      {
        authorizationToken: randomStr(),
        methodArn: randomStr(),
        type: randomStr(),
      },
      createLambdaContext(),
      (e, r) => {});

    const collected2 = collected;

    expect(collected1.singleton).to.be.equal(collected2.singleton);
    expect(collected1.scoped1).to.not.equal(collected2.scoped1);
    expect(collected1.transient1).to.not.equal(collected2.transient1);

    expect(collected1.scoped1).to.be.equal(collected1.scoped2);
    expect(collected2.scoped1).to.be.equal(collected2.scoped2);
    expect(collected1.transient1).to.not.equal(collected1.transient2);
  });

});
