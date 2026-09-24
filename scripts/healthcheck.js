#!/usr/bin/env node

'use strict';

const os = require('os');
const { CHECK_SCOPES, runHealthchecks } = require('./lib/healthcheck');

function showHelp(exitCode = 0) {
  console.log(`
Usage: node scripts/healthcheck.js [--scope <${CHECK_SCOPES.join('|')}>] [--home <path>] [--json]

Validate the ECC agentic environment deterministically (read-only).
Exit code: 0 = pass, 1 = error, 2 = warning.

Options:
  --scope <s>    Restrict to one scope (repeatable). Default: all.
  --home <path>  Home directory to target. Default: $HOME.
  --json         Emit the raw report as JSON.
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    scopes: [],
    home: os.homedir(),
    json: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--scope') {
      parsed.scopes.push(args[index + 1] || null);
      index += 1;
    } else if (arg === '--home') {
      parsed.home = args[index + 1] || os.homedir();
      index += 1;
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function main() {
  try {
    const options = parseArgs(process.argv);
    if (options.help) {
      showHelp(0);
    }

    const outcome = runHealthchecks({
      scopes: options.scopes,
      home: options.home,
      outputFormat: options.json ? 'json' : 'text',
    });

    const report = options.json ? outcome : outcome.report;

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(outcome.text);
    }

    if (report.status === 'error') process.exitCode = 1;
    else if (report.status === 'warning') process.exitCode = 2;
    else process.exitCode = 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();