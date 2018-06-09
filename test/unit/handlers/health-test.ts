import * as awsLambda from "aws-lambda";
import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { lambda } from "../../../src/core/builder";
import { randomStr } from "../../../src/core/utils";
import { health } from "../../../src/handlers/health";
import { HealthCheckResult, HealthCheckStatus } from "../../../src/services/health-check";
import { createAPIGatewayProxyEvent, createLambdaContext } from "../lambda-helper-test";

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

  it("should run health checks with API Events - OK", async () => {

    const name = randomStr();
    const handler = lambda()
      .handler(health(name, async ({ }) => []));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.OK);
  });

  it("should run health checks with API Events - Warning", async () => {

    const name = randomStr();
    const handler = lambda()
      .handler(health(name, async ({ }) => [
        async () => ({ name: "Warning", status: HealthCheckStatus.Warning }),
      ]));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.BAD_REQUEST);
  });

  it("should run health checks with API Events - Error", async () => {

    const name = randomStr();
    const handler = lambda()
      .handler(health(name, async ({ }) => [
        async () => ({ name: "Error", status: HealthCheckStatus.Error }),
      ]));

    const lambdaResult = await handler(
      createAPIGatewayProxyEvent(),
      createLambdaContext(),
      (e, r) => { }) as awsLambda.APIGatewayProxyResult;

    expect(lambdaResult.statusCode).to.equal(HttpStatusCodes.INTERNAL_SERVER_ERROR);
  });
});
