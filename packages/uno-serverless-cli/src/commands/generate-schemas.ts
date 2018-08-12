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
      { choices: ["json", "yaml", "ts"], default: "json", alias: "f", describe: "Output format" })
    .option(
      "out",
      { alias: "o", describe: "Output to file" });
};

export const handler = (yargs) => {
  try {
    const generation = new SchemaGeneration({
      files: yargs.files,
      format: yargs.format,
    });
    const result = generation.run();
    if (yargs.out) {
      writeFileSync(yargs.out, result);
    } else {
      process.stdout.write(result);
    }
  } catch (error) {
    (chalk as any).red(error);
  }
};
