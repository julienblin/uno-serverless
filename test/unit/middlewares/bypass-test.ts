import { expect } from "chai";
import { describe, it } from "mocha";
import { uno } from "../../../src/core/builder";
import { bypass } from "../../../src/middlewares/bypass";
import { awsLambdaAdapter } from "../../../src/providers/aws";
import { createLambdaContext } from "../lambda-helper-test";

describe("bypass middleware", () => {

  it("should let execution through", async () => {

    let executed = false;
    const handler = uno(awsLambdaAdapter())
      .use(bypass(() => false))
      .handler(async ({}) => {
        executed = true;
      });

    await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(executed).to.be.true;
  });

  it("should bypass execution", async () => {

    let executed = false;
    const handler = uno(awsLambdaAdapter())
      .use(bypass(() => true))
      .handler(async ({}) => {
        executed = true;
      });

    await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(executed).to.be.false;
  });

  it("should bypass execution and return alternate", async () => {

    let executed = false;
    const handler = uno(awsLambdaAdapter())
      .use(bypass(() => true, async () => 1))
      .handler(async ({}) => {
        executed = true;
      });

    const result = await handler(
      {},
      createLambdaContext(),
      (e, r) => {});

    expect(result).to.equal(1);
    expect(executed).to.be.false;
  });

});
