import { Command } from "commander";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json").toString());

const program = new Command("uno")
  .version(packageJson.version)
  .parse(process.argv);

program.outputHelp();
