import { expect } from "chai";
import { testAdapter, uno } from "../../../src/core/uno";
import { errorLogging } from "../../../src/middlewares/logging";

describe("errorLogging middleware", () => {

  it("should log errors", async () => {

    let logged;

    const handler = uno(testAdapter())
      .use(errorLogging((_, message) => { logged = message; }))
      .handler(async () => { throw new Error("foo"); });

    try {
      await handler(
        {
          bar: "bar",
        });
      expect.fail();
    } catch (error) {
      expect(logged).to.not.be.undefined;
      expect(logged).to.contain("foo");
      expect(logged).to.contain("bar");
    }
  });

  it("should do nothing when no error", async () => {

    let logged;

    const handler = uno(testAdapter())
      .use(errorLogging((message) => { logged = message; }))
      .handler(async () => 1);

    const result = await handler(
      {
        bar: "bar",
      });
    expect(logged).to.be.undefined;
    expect(result).to.equal(1);
  });

});
