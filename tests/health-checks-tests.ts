import { expect } from "chai";
import * as HttpStatusCodes from "http-status-codes";
import { describe, it } from "mocha";
import { checkHealth, HealthChecker, HealthCheckResult, HealthCheckStatus, ICheckHealth } from "../src/health-checks";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion

describe("HealthChecker", () => {

  const HEALTH_CHECKER_NAME = "TestHeathChecker";

  class MockCheckHealth implements ICheckHealth {

    public ran = false;

    public constructor(public readonly mockResult: HealthCheckResult) {}

    public async checkHealth(): Promise<HealthCheckResult> {
      this.ran = true;

      return this.mockResult;
    }
  }

  it("should work with no health checks and return inconclusive", async () => {
    const checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, []);
    const result = await checker.checkHealth();

    expect(result.name).to.equal(HEALTH_CHECKER_NAME);
    expect(result.status).to.equal(HealthCheckStatus.Inconclusive);
    expect(result.children).to.be.empty;
  });

  it("should run all health checks", async () => {

    const healthChecks = [
      new MockCheckHealth(new HealthCheckResult("mock1", undefined, 0, HealthCheckStatus.Ok)),
      new MockCheckHealth(new HealthCheckResult("mock2", undefined, 0, HealthCheckStatus.Ok)),
    ];

    const checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    const result = await checker.checkHealth();

    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.children).to.have.lengthOf(healthChecks.length);
    expect(result.children).to.contain(healthChecks[0].mockResult);
    expect(healthChecks.every((x) => x.ran)).to.be.true;
  });

  it("should aggregate status based on priority", async () => {

    const healthChecks = [
      new MockCheckHealth(new HealthCheckResult("mock1", undefined, 0, HealthCheckStatus.Ok)),
      new MockCheckHealth(new HealthCheckResult("mock2", undefined, 0, HealthCheckStatus.Error)),
      new MockCheckHealth(new HealthCheckResult("mock3", undefined, 0, HealthCheckStatus.Warning)),
      new MockCheckHealth(new HealthCheckResult("mock4", undefined, 0, HealthCheckStatus.Inconclusive)),
    ];

    let checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    let result = await checker.checkHealth();

    expect(result.status).to.equal(HealthCheckStatus.Error);

    healthChecks.splice(1, 1);
    checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    result = await checker.checkHealth();

    expect(result.status).to.equal(HealthCheckStatus.Warning);

    healthChecks.splice(1, 1);
    checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    result = await checker.checkHealth();

    expect(result.status).to.equal(HealthCheckStatus.Inconclusive);

    healthChecks.splice(1, 1);
    checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    result = await checker.checkHealth();

    expect(result.status).to.equal(HealthCheckStatus.Ok);
  });

  it("should filter targets", async () => {

    const healthChecks = [
      new MockCheckHealth(new HealthCheckResult("mock1", "target", 0, HealthCheckStatus.Ok)),
    ];

    let checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    let result = await checker.checkHealth();

    expect(result.children![0].target).to.equal("target");

    checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: false }, healthChecks);
    result = await checker.checkHealth();

    expect(result.children![0].target).to.be.undefined;
  });

  it("should return APIGateway compatible responses", async () => {

    const healthChecks = [
      new MockCheckHealth(new HealthCheckResult("mock1", "target", 0, HealthCheckStatus.Ok)),
    ];

    const checker = new HealthChecker({ name: HEALTH_CHECKER_NAME, includeTargets: true }, healthChecks);
    const result = (await checker.checkHealth()).getAPIGatewayProxyResult();

    expect(result.statusCode).to.equal(HttpStatusCodes.OK);
  });

});

describe("checkHealth", () => {

  it("should check health OK", async () => {
    const healthCheckName = "healthCheckName";
    const healthCheckTarget = "healthCheckTarget";
    const result = await checkHealth(
      healthCheckName,
      healthCheckTarget,
      async () => { new Promise((resolve) => setTimeout(resolve, 5)); });

    expect(result.name).to.equal(healthCheckName);
    expect(result.target).to.equal(healthCheckTarget);
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.elapsed).to.be.greaterThan(0);
  });

  it("should check health Error", async () => {
    const healthCheckName = "healthCheckName";
    const healthCheckTarget = "healthCheckTarget";
    const error = new Error("errorMessage");
    const result = await checkHealth(
      healthCheckName,
      healthCheckTarget,
      async () => { throw error; });

    expect(result.name).to.equal(healthCheckName);
    expect(result.target).to.equal(healthCheckTarget);
    expect(result.error).to.equal(error);
    expect(result.status).to.equal(HealthCheckStatus.Error);
    expect(result.elapsed).to.be.greaterThan(0);
  });

});
