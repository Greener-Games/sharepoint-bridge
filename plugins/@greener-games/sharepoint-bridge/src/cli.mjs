#!/usr/bin/env node
/**
 * CLI runner for SharePoint Tab Dev Bridge
 *
 * Supports flags:
 *   --port=8080
 *   --profile=mainSite
 *   --url=https://<tenant>.sharepoint.com/sites/...
 *   --config=./serverconfig.js
 */

import { createSharePointBridge } from './server.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--profile=')) {
      options.profile = arg.split('=')[1];
    } else if (arg.startsWith('--url=')) {
      options.sharepointUrl = arg.split('=')[1];
    } else if (arg.startsWith('--config=')) {
      options.configPath = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
SharePoint Tab Dev Bridge CLI

Usage:
  node src/cli.mjs [options]

Options:
  --port=<port>        Server port (default: from serverconfig.js or 8080)
  --profile=<name>     Named profile from serverconfig.js
  --url=<url>          SharePoint target site URL
  --config=<path>      Path to serverconfig.js
  --help, -h           Show help
`);
      process.exit(0);
    }
  }

  return options;
}

const cliOptions = parseArgs();

createSharePointBridge(cliOptions).catch((err) => {
  console.error('\x1b[31m[SP Bridge Error]\x1b[0m', err);
  process.exit(1);
});
