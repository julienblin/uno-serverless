/*
 * This file loads the openapi.yml YAML spec and transforms it
 * to json.
 */

const apiVersion = require('./api-version');

module.exports = () => {
  const yaml = require('js-yaml');
  const fs = require('fs');

  const doc = yaml.safeLoad(fs.readFileSync('./openapi.yml', 'utf8'));

  doc.info.version = apiVersion();

  return JSON.stringify(doc);
}
