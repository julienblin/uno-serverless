import { expect } from "chai";
import { HttpStatusCodes } from "../../../src/core/http-status-codes";
import { testAdapter, uno } from "../../../src/core/uno";
import { randomStr } from "../../../src/core/utils";
import { health } from "../../../src/handlers/health";
import { HealthCheckResult, HealthCheckStatus } from "../../../src/services/health-check";

describe("health handler", () => {

  it("should run health checks", async () => {

    const name = randomStr();
    const handler = uno(testAdapter())
      .handler(health(name, async ({ }) => []));

    const lambdaResult = await handler() as HealthCheckResult;

    expect(lambdaResult.name).to.equal(name);
    expect(lambdaResult.status).to.equal(HealthCheckStatus.Inconclusive);
  });

  it("should run health checks with API Events - OK", async () => {

    const name = randomStr();
    const handler = uno(testAdapter())
      .handler(health(name, async ({ }) => []));

    const lambdaResult = await handler({
      unoEventType: "http",
    });

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should run health checks with API Events - Warning", async () => {

    const name = randomStr();
    const handler = uno(testAdapter())
      .handler(health(name, async ({ }) => [
        async () => ({ name: "Warning", status: HealthCheckStatus.Warning }),
      ]));

    const lambdaResult = await handler({
      unoEventType: "http",
    });

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.BAD_REQUEST);
  });

  it("should run health checks with API Events - Error", async () => {

    const name = randomStr();
    const handler = uno(testAdapter())
      .handler(health(name, async ({ }) => [
        async () => ({ name: "Error", status: HealthCheckStatus.Error }),
        async () => { throw new Error("foo"); },
      ]));

    const lambdaResult = await handler({
      unoEventType: "http",
    });

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.INTERNAL_SERVER_ERROR);
    const serializedResult = JSON.parse(JSON.stringify(lambdaResult));
    expect(serializedResult.body.children[1].error.message).to.equal("foo");
  });
});
