import { expect } from "chai";
import { lambda } from "../../../src/core/builder";
import { errorLogging } from "../../../src/middlewares/logging";
import { createLambdaContext } from "../lambda-helper-test";

describe("errorLogging middleware", () => {

  it("should log errors", async () => {

    let logged;

    const handler = lambda()
      .use(errorLogging((message) => { logged = message; }))
      .handler(async () => { throw new Error("foo"); });

    try {
      await handler(
        {
          bar: "bar",
        },
        createLambdaContext(),
        (e, r) => { });
      expect(false);
    } catch (error) {
      expect(logged).to.not.be.undefined;
      expect(logged).to.contain("foo");
      expect(logged).to.contain("bar");
    }
  });

  it("should do nothing when no error", async () => {

    let logged;

    const handler = lambda()
      .use(errorLogging((message) => { logged = message; }))
      .handler(async () => 1);

    const result = await handler(
      {
        bar: "bar",
      },
      createLambdaContext(),
      (e, r) => { });
    expect(logged).to.be.undefined;
    expect(result).to.equal(1);
  });

});
