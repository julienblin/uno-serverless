import * as glob from "glob";
import * as TJS from "typescript-json-schema";

export interface SchemaGenerationOptions {
  files: string;
  format: "json" | "yaml" | "ts";
  out?: string;
}

export class SchemaGeneration {

  public constructor(private readonly options: SchemaGenerationOptions) {}

  public run(): string {
    const allFiles = glob.sync(this.options.files);
    const program = TJS.getProgramFromFiles(allFiles, { strictNullChecks: true });
    const generator = TJS.buildGenerator(program, { required: true })!;
    const jsonSchema = generator.getSchemaForSymbols(generator.getMainFileSymbols(program));

    switch (this.options.format) {
      case "json":
        return JSON.stringify(jsonSchema, undefined, 2);
      default:
        throw new Error("Unsupported format: " + this.options.format);
    }
  }
}
