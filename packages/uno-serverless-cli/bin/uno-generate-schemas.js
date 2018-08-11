#!/usr/bin/env node

'use strict';

const path = require('path');
const commands = require(path.resolve(__dirname, "../dist"));
commands.generateSchemas();
