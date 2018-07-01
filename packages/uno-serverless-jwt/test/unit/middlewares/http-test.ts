import { expect } from "chai";
import { HttpUnoEvent, randomStr, testAdapter, uno } from "uno-serverless";
import { principalFromBearerToken } from "../../../src/middlewares/http";

describe("principalFromBearerToken", () => {

  it("should pass the bearer token", async () => {
    const token = randomStr();
    const handler = uno(testAdapter())
      .use(principalFromBearerToken(async (arg, bearerToken) => bearerToken))
      .handler<HttpUnoEvent, any>(async ({ event }) => {
        return await event.principal();
      });

    const result = await handler({
      headers: {
        authorization: `bearer ${token}`,
      },
    });

    expect(result).to.equal(token);

  });

  it("should throw if no token", async () => {
    const token = randomStr();
    const handler = uno(testAdapter())
      .use(principalFromBearerToken(async (arg, bearerToken) => bearerToken))
      .handler<HttpUnoEvent, any>(async ({ event }) => {
        return await event.principal();
      });

    try {
      await handler({
        headers: {
          authorization: "",
        },
      });
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("unauthorized");
    }

  });

  it("should memoize", async () => {
    const token = randomStr();
    let executions = 0;
    const handler = uno(testAdapter())
      .use(principalFromBearerToken(async (arg, bearerToken) => { ++executions; return bearerToken; }))
      .handler<HttpUnoEvent, any>(async ({ event }) => {
        const result1 = await event.principal();
        const result2 = await event.principal();
        expect(result1).to.equal(result2).to.equal(token);
        return result2;
      });

    const result = await handler({
      headers: {
        authorization: `bearer ${token}`,
      },
    });

    expect(executions).to.equal(1);

  });
});
