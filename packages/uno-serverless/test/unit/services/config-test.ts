import { expect } from "chai";
import { describe, it } from "mocha";
import { StandardErrorCodes } from "../../../src/core/errors";
import { randomStr } from "../../../src/core/utils";
import {
  CompositeConfigService, ConfigService,
  JSONFileConfigService, ProcessEnvConfigService, StaticConfigService } from "../../../src/services/config";
import { HealthCheckStatus } from "../../../src/services/health-check";

describe("StaticConfigService", () => {

  it("should return mandatory values", async () => {
    const values = { foo: "bar" };
    const config = new StaticConfigService(values) as ConfigService;

    const result = await config.get("foo");
    expect(result).to.equal(values.foo);
  });

  it("should return optional values", async () => {
    const config = new StaticConfigService({}) as ConfigService;

    const result = await config.get("foo", false);
    expect(result).to.be.undefined;
  });

  it("should throw on missing required values", async () => {
    const config = new StaticConfigService({}) as ConfigService;

    try {
      await config.get("foo");
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("StaticConfigService");
    }

    try {
      await config.get("foo", true);
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("StaticConfigService");
    }
  });

});

describe("ProcessEnvConfigService", () => {

  it("should return mandatory values", async () => {
    process.env.foo = "bar";
    const config = new ProcessEnvConfigService() as ConfigService;

    const result = await config.get("foo");
    expect(result).to.equal(process.env.foo);
  });

  it("should return optional values", async () => {
    const config = new ProcessEnvConfigService({}) as ConfigService;

    const result = await config.get("foo", false);
    expect(result).to.be.undefined;
  });

  it("should throw on missing required values", async () => {
    const config = new ProcessEnvConfigService({}) as ConfigService;

    try {
      await config.get("foo");
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("ProcessEnvConfigService");
    }

    try {
      await config.get("foo", true);
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("ProcessEnvConfigService");
    }
  });
});

describe("JSONFileConfigService", () => {

  const testConfigFile = "./test/unit/services/config-test.json";

  it("should return mandatory values", async () => {
    const config = new JSONFileConfigService({
      path: testConfigFile,
    }) as ConfigService;

    const result = await config.get("foo");
    expect(result).to.equal(process.env.foo);
  });

  it("should return optional values", async () => {
    const config = new JSONFileConfigService({
      path: testConfigFile,
    }) as ConfigService;

    const result = await config.get("missing", false);
    expect(result).to.be.undefined;
  });

  it("should throw on missing required values", async () => {
    const config = new JSONFileConfigService({
      path: testConfigFile,
    }) as ConfigService;

    try {
      await config.get("missing");
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("missing");
      expect(error.data.provider).to.equal("JSONFileConfigService");
    }

    try {
      await config.get("missing", true);
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("missing");
      expect(error.data.provider).to.equal("JSONFileConfigService");
    }
  });

  it("should throw on missing files", async () => {
    const path = randomStr();
    const config = new JSONFileConfigService({
      path,
    }) as ConfigService;

    try {
      await config.get("foo", false);
      expect.fail();
    } catch (error) {
      expect(error.message).to.contain(path);
    }
  });

  it("should check health", async () => {
    const config = new JSONFileConfigService({
      path: testConfigFile,
    });

    const result = await config.checkHealth();
    expect(result.name).to.equal("JSONFileConfigService");
    expect(result.target).to.equal(testConfigFile);
    expect(result.status).to.equal(HealthCheckStatus.Ok);
  });
});

describe("CompositeConfigService", () => {

  const testConfigFile = "./test/unit/services/config-test.json";

  it("should return mandatory values", async () => {
    process.env.foo = "bar";
    const configService1 = new ProcessEnvConfigService();
    const configService2 = new JSONFileConfigService({
      path: testConfigFile,
    });

    const config = new CompositeConfigService([ configService1, configService2 ]);

    let result = await config.get("foo");
    expect(result).to.equal(process.env.foo);
    result = await config.get("foo2");
    expect(result).to.equal("bar2");
  });

  it("should return optional values", async () => {
    const config = new CompositeConfigService([]) as ConfigService;

    const result = await config.get("foo", false);
    expect(result).to.be.undefined;
  });

  it("should throw on missing required values", async () => {
    const config = new CompositeConfigService([]) as ConfigService;

    try {
      await config.get("foo");
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("CompositeConfigService");
    }

    try {
      await config.get("foo", true);
      expect.fail();
    } catch (error) {
      expect(error.code).to.equal(StandardErrorCodes.ConfigurationError);
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("CompositeConfigService");
    }
  });

  it("should check health", async () => {
    const configService1 = new ProcessEnvConfigService();
    const configService2 = new JSONFileConfigService({
      path: testConfigFile,
    });

    const config = new CompositeConfigService([ configService1, configService2 ]);

    const result = await config.checkHealth();
    expect(result.status).to.equal(HealthCheckStatus.Ok);
    expect(result.children).to.have.lengthOf(2);
  });
});
