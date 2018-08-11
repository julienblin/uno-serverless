import program = require("commander");
import { readFileSync } from "fs";

export function root() {
  const packageJson = JSON.parse(readFileSync("./package.json").toString());

  program
    .version(packageJson.version, "-v, --version")
    .description("uno-serverless cli")
    .command("generate-schemas <files>", "Generate schemas from Typescript interfaces")
    .alias("gs")
    .parse(process.argv);

  if (!program.args.length) {
    program.help();
  }
}
