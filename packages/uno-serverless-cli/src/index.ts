import chalk = require("chalk");
import * as yargs from "yargs";
import generateSchemas = require("./commands/generate-schemas");

yargs.usage("$0 command")
  .command(generateSchemas)
  .demand(1, (chalk as any).red("Error: Must provide a valid command"))
  .help("h")
  .alias("h", "help")
  .parse();
