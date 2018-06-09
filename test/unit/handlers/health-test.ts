import * as awsLambda from "aws-lambda";
import { expect } from "chai";
import { lambda } from "../../../src/core/builder";
import { randomStr } from "../../../src/core/utils";
import { health } from "../../../src/handlers/health";
import { HealthCheckResult, HealthCheckStatus } from "../../../src/services/health-check";
import { createLambdaContext } from "../lambda-helper-test";

describe("health handler", () => {

  it("should run health checks", async () => {

    const name = randomStr();
    const handler = lambda()
      .handler(health(name, async ({ }) => []));

    const lambdaResult = await handler(
      {},
      createLambdaContext(),
      (e, r) => { }) as HealthCheckResult;

    expect(lambdaResult.name).to.equal(name);
    expect(lambdaResult.status).to.equal(HealthCheckStatus.Inconclusive);
  });

});
