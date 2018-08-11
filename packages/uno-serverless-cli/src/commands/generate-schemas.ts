import chalk from "chalk";
import program = require("commander");

export function generateSchemas() {
  program
    .arguments("<files>")
    .action((files) => {
      console.log("Generate schemas for " + files);
    })
    .parse(process.argv);

  if (process.argv.length === 0) {
    console.error(chalk.red("Missing files selection pattern."));
    process.exit(1);
  }
}
