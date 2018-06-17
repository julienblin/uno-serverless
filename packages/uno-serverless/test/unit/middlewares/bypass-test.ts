import { expect } from "chai";
import { describe, it } from "mocha";
import { testAdapter, uno } from "../../../src/core/uno";
import { bypass } from "../../../src/middlewares/bypass";

describe("bypass middleware", () => {

  it("should let execution through", async () => {

    let executed = false;
    const handler = uno(testAdapter())
      .use(bypass(() => false))
      .handler(async ({}) => {
        executed = true;
      });

    await handler();

    expect(executed).to.be.true;
  });

  it("should bypass execution", async () => {

    let executed = false;
    const handler = uno(testAdapter())
      .use(bypass(() => true))
      .handler(async ({}) => {
        executed = true;
      });

    await handler();

    expect(executed).to.be.false;
  });

  it("should bypass execution and return alternate", async () => {

    let executed = false;
    const handler = uno(testAdapter())
      .use(bypass(() => true, async () => 1))
      .handler(async ({}) => {
        executed = true;
      });

    const result = await handler();

    expect(result).to.equal(1);
    expect(executed).to.be.false;
  });

});
