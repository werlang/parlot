const fs = require('fs');
let version = require('../worker/package.json').version;

version = JSON.stringify({ version: version });
fs.writeFileSync('../worker/version.json', version);