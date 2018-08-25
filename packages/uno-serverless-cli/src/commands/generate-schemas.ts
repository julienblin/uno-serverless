import chalk = require("chalk");
import { writeFileSync } from "fs";
import { SchemaGeneration } from "../services/schema-generation";

export const command = "generate-schemas <files>";
export const describe = "Generate schemas from Typescript interfaces";

export const builder = (yargs) => {
  return yargs
    .positional("files", { description: "pattern to select files", type: "string" })
    .option(
      "format",
      { choices: ["json", "yaml", "ts", "openapi3"], default: "json", alias: "f", describe: "Output format" })
    .option(
      "config",
      { alias: "c", describe: "Path to tsconfig.json file" })
    .option(
      "out",
      { alias: "o", describe: "Output to file" });
};

export const handler = (yargs) => {
  try {
    const generation = new SchemaGeneration({
      config: yargs.config,
      files: yargs.files,
      format: yargs.format,
      out: yargs.out,
    });
    const result = generation.run();
    if (yargs.out) {
      if (yargs.format !== "openapi3") {
        writeFileSync(yargs.out, result);
      }
    } else {
      process.stdout.write(result);
    }
  } catch (error) {
    console.error((chalk as any).red(error.toString()));
  }
};
