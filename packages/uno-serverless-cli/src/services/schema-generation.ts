import * as glob from "glob";
import * as YAML from "json2yaml";
import * as path from "path";
import * as TJS from "typescript-json-schema";

export interface SchemaGenerationOptions {
  files: string;
  format: "json" | "yaml" | "ts";
  out?: string;
}

export class SchemaGeneration {

  public constructor(private readonly options: SchemaGenerationOptions) {}

  public run(): string {
    const allFiles = glob.sync(this.options.files).map((x) => path.resolve(x)).map(this.normalizeFileName);
    const program = TJS.getProgramFromFiles(allFiles, { strictNullChecks: true });
    const generator = TJS.buildGenerator(program, { noExtraProps: true, required: true })!;
    const mainFileSymbols = generator.getMainFileSymbols(program, allFiles);
    const jsonSchema = generator.getSchemaForSymbols(mainFileSymbols);
    delete jsonSchema.$schema;

    switch (this.options.format) {
      case "json":
        return JSON.stringify(jsonSchema, undefined, 2);
      case "yaml":
        return YAML.stringify(jsonSchema);
      default:
        throw new Error("Unsupported format: " + this.options.format);
    }
  }

  private normalizeFileName(fn: string): string {
    while (fn.substr(0, 2) === "./") {
        fn = fn.substr(2);
    }
    return fn.replace(/\\/g, "/");
  }
}
