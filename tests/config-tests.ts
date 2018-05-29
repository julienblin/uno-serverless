import { expect } from "chai";
import { describe, it } from "mocha";
import { ConfigService, ProcessEnvConfigService, StaticConfigService } from "../src/config";

// tslint:disable:newline-per-chained-call
// tslint:disable:no-unused-expression
// tslint:disable:no-magic-numbers
// tslint:disable:no-non-null-assertion

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
      expect(error.data.configKey).to.equal("foo");
      expect(error.data.provider).to.equal("StaticConfigService");
    }

    try {
      await config.get("foo", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.configKey).to.equal("foo");
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
      expect(error.data.configKey).to.equal("foo");
      expect(error.data.provider).to.equal("ProcessEnvConfigService");
    }

    try {
      await config.get("foo", true);
      expect(false);
    } catch (error) {
      expect(error.code).to.equal("configurationError");
      expect(error.data.configKey).to.equal("foo");
      expect(error.data.provider).to.equal("ProcessEnvConfigService");
    }
  });

});
