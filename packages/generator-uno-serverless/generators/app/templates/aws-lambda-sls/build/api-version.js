/*
 * This file returns an api version composed of:
 * package.version+gitshortcommit[-dirty]
 */

module.exports = () => {
  const fs = require('fs');
  const childProcess = require('child_process');
  const processStdio = { stdio: ['pipe', 'pipe', 'ignore'] };

  const package = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  try {
    const gitShortCommit = childProcess.execSync('git rev-parse --short HEAD', processStdio).toString().trim();
    let isDirty = false;
    try {
      childProcess.execSync('git diff --no-ext-diff --quiet --exit-code', processStdio)
    } catch (error) {
      isDirty = true;
    }
    const apiVersion = `${package.version}+${gitShortCommit}${isDirty ? "-dirty" : ""}`;

    return apiVersion;
  } catch (error) {
    return package.version;
  }
}
