import { expect } from "chai";
import { randomStr } from "../../../src/core/utils";
import { checkHealth, HealthCheckStatus, CheckHealth } from "../../../src/services/health-check";

describe("health-checks", () => {

  it("should run a single function", async () => {
    let executed = false;
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(name, target, async () => { executed = true; });

    expect(executed).to.be.true;
    expect(result.name).to.equal(name);
    expect(result.target).to.equal(target);
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.elapsed).to.be.greaterThan(0);
  });

  it("should run a single function that returns a HealthCheckResult", async () => {
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(
      name,
      target,
      async () => ({
        name: randomStr(),
        status: HealthCheckStatus.Warning,
      }));

    expect(result.name).to.not.equal(name);
    expect(result.status).to.equal(HealthCheckStatus.Warning);
  });

  it("should run a CheckHealth", async () => {
    const checkHealthInstance: CheckHealth = {
      checkHealth: async () => ({ name: randomStr(), status: HealthCheckStatus.Warning }),
    };
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(name, target, checkHealthInstance);

    expect(result.status).to.equal(HealthCheckStatus.Warning);
  });

  it("should capture function execution error", async () => {
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(name, target, async () => { throw new Error("foo"); });

    expect(result.name).to.equal(name);
    expect(result.target).to.equal(target);
    expect(result.status).to.equal(HealthCheckStatus.Error);
    expect(result.error!.message).to.equal("foo");
    expect(result.elapsed).to.be.greaterThan(0);
  });

  it("should run multiple functions", async () => {
    let executed1 = false;
    let executed2 = false;
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(
      name,
      target,
      [
        async () => { executed1 = true; },
        async () => { executed2 = true; },
      ]);

    expect(executed1).to.be.true;
    expect(executed2).to.be.true;
    expect(result.name).to.equal(name);
    expect(result.target).to.equal(target);
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.elapsed).to.be.greaterThan(0);
  });

  it("should run multiple functions with errors", async () => {
    const name = randomStr();
    const target = randomStr();
    const result = await checkHealth(
      name,
      target,
      [
        async () => {  },
        async () => { throw new Error("foo"); },
      ]);

    expect(result.name).to.equal(name);
    expect(result.target).to.equal(target);
    expect(result.status).to.equal(HealthCheckStatus.Error);
    expect(result.elapsed).to.be.greaterThan(0);
  });

  it("should aggregate statuses", async () => {
    const name = randomStr();
    const target = randomStr();

    const runs = [
      [ HealthCheckStatus.Ok, HealthCheckStatus.Inconclusive, HealthCheckStatus.Warning, HealthCheckStatus.Error ],
      [ HealthCheckStatus.Ok, HealthCheckStatus.Inconclusive, HealthCheckStatus.Warning ],
      [ HealthCheckStatus.Ok, HealthCheckStatus.Inconclusive ],
      [ HealthCheckStatus.Ok ],
    ];
    for (const run of runs) {
      const result = await checkHealth(
        name,
        target,
        run.map((x) => async () => ({ name: randomStr(), status: x })),
      );

      expect(result.status).to.equal(run.slice(-1)[0]);
    }
  });
});
