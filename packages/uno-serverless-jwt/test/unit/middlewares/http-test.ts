import { expect } from "chai";
import { HttpUnoEvent, randomStr, StandardErrorCodes, testAdapter, uno } from "uno-serverless";
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
      expect(error.code).to.equal(StandardErrorCodes.Unauthorized);
    }

  });

  it("should memoize", async () => {
    const token1 = randomStr();
    const token2 = randomStr();
    let executions = 0;
    const handler = uno(testAdapter())
      .use(principalFromBearerToken(async (arg, bearerToken) => { ++executions; return bearerToken; }))
      .handler<HttpUnoEvent, any>(async ({ event }) => {
        const principalResult1 = await event.principal();
        const principalResult2 = await event.principal();
        expect(principalResult2).to.equal(principalResult1);
        return principalResult2;
      });

    const result = await handler({
      headers: {
        authorization: `bearer ${token1}`,
      },
    });

    const result2 = await handler({
      headers: {
        authorization: `bearer ${token2}`,
      },
    });

    expect(executions).to.equal(2);
    expect(result).to.equal(token1);
    expect(result2).to.equal(token2);
  });
});
