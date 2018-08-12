import chalk = require("chalk");
import * as yargs from "yargs";
import { SchemaGeneration } from "./services/schema-generation";

yargs.usage("$0 command")
  .command(
    "generate-schemas <files>",
    "Generate schemas from Typescript interfaces",
    (y) => {
      return y
        .positional("files", { description: "pattern to select files", type: "string" })
        .option(
            "format",
            { choices: [ "json", "yaml", "ts" ], default: "json", alias: "f", describe: "Output format" });
    },
    (y) => {
      const generation = new SchemaGeneration({
        files: y.files,
        format: y.format,
      });
      const result = generation.run();
      process.stdout.write(result);
    })
  .demand(1, (chalk as any).red("Error: Must provide a valid command"))
  .help("h")
  .alias("h", "help")
  .parse();
