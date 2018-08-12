import * as path from "path";
import { SchemaGeneration } from "../../../src/services/schema-generation";

describe("SchemaGeneration", () => {

  const basePath = path.resolve(__dirname);
  const files = `${basePath}/../samples/entities/*.ts`;

  it("should generate JSON schemas", () => {
    const generation = new SchemaGeneration({
      files,
      format: "json",
    });

    const result = generation.run();
  });

});
