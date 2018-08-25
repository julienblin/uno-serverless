import { expect } from "chai";
import { readFileSync, writeFileSync } from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import { SchemaGeneration } from "../../../src/services/schema-generation";

describe("SchemaGeneration", function() {
  this.timeout(10000);

  const basePath = path.resolve(__dirname);
  const files = `${basePath}/../samples/entities/*.ts`;
  const filesWithPath = `${basePath}/../samples/entities-path/*.ts`;
  const tsConfig = `${basePath}/../samples/tsconfig.json`;
  const openApiSchemaFile = `${basePath}/../samples/openapi.yml`;

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

  it("should generate TS schemas with tsconfig", () => {

    const generation = new SchemaGeneration({
      config: tsConfig,
      files: filesWithPath,
      format: "ts",
    });

    const result = generation.run();
    expect(result).to.contain("userSchema");
    expect(result).to.contain("addressSchema");
  });

  it("should generate OpenAPI3 schemas", () => {

    const generation = new SchemaGeneration({
      files,
      format: "openapi3",
    });

    const result = generation.run();
    expect(result).to.contain("User");
    expect(result).to.contain("Address");
    expect(result).to.not.contain("#/definitions");
  });

  it("should write OpenAPI3 schemas files", () => {

    const openApiFileContent = readFileSync(openApiSchemaFile);

    try {
      const generation = new SchemaGeneration({
        files,
        format: "openapi3",
        out: openApiSchemaFile,
      });

      generation.run();
      const openApiFileContentModified = readFileSync(openApiSchemaFile).toString();
      expect(openApiFileContentModified).to.contain("User");
      expect(openApiFileContentModified).to.contain("Address");
    } finally {
      writeFileSync(openApiSchemaFile, openApiFileContent);
    }
  });

});
