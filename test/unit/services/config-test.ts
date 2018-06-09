import { expect } from "chai";
import { describe, it } from "mocha";
import { randomStr } from "../../../src/core/utils";
import {
  ConfigService, JSONFileConfigService,
  ProcessEnvConfigService, StaticConfigService } from "../../../src/services/config";

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
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("StaticConfigService");
    }

    try {
      await config.get("foo", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
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
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.key).to.equal("foo");
      expect(error.data.provider).to.equal("ProcessEnvConfigService");
    }

    try {
      await config.get("foo", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
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
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.key).to.equal("missing");
      expect(error.data.provider).to.equal("JSONFileConfigService");
    }

    try {
      await config.get("missing", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
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
      expect(false);
    } catch (error) {
      expect(error.message).to.contain(path);
    }
  });
});
