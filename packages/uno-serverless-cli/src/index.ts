import chalk = require("chalk");
import * as yargs from "yargs";

// tslint:disable-next-line:no-unused-expression-chai
yargs.usage("$0 command")
  .command("generate-schemas", "Generate schemas from Typescript interfaces")
  .demand(1, (chalk as any).red("Error: Must provide a valid command"))
  .help("h")
  .alias("h", "help")
  .argv;
