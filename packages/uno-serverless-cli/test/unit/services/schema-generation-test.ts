import { expect } from "chai";
import * as yaml from "js-yaml";
import * as path from "path";
import { SchemaGeneration } from "../../../src/services/schema-generation";

describe("SchemaGeneration", function() {
  this.timeout(10000);

  const basePath = path.resolve(__dirname);
  const files = `${basePath}/../samples/entities/*.ts`;

  it("should generate JSON schemas", () => {

    const generation = new SchemaGeneration({
      files,
      format: "json",
    });

    const result = generation.run();
    const parsedResult = JSON.parse(result);
    expect(parsedResult.definitions.User).to.not.be.undefined;
    expect(parsedResult.definitions.User.properties.email.type).to.equal("string");
  });

  it("should generate YAML schemas", () => {

    const generation = new SchemaGeneration({
      files,
      format: "yaml",
    });

    const result = generation.run();
    const parsedResult = yaml.load(result) as any;
    expect(parsedResult.definitions.User).to.not.be.undefined;
    expect(parsedResult.definitions.User.properties.email.type).to.equal("string");
  });

  it("should generate TS schemas", () => {

    const generation = new SchemaGeneration({
      files,
      format: "ts",
    });

    const result = generation.run();
    expect(result).to.contain("userSchema");
    expect(result).to.contain("addressSchema");
  });

});
