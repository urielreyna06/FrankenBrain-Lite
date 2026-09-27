#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_FILES = [
  'README.md', 'AGENTS.md', 'gemini-extension.json',
  'scripts/security-gate.sh', 'scripts/validate.sh',
];
const COMPONENTS = {
  skills: { folder: 'skills', matches: (name) => existsSync(join(name, 'SKILL.md')) },
  agents: { folder: 'agents', matches: (name) => name.endsWith('.md') },
  commands: { folder: 'commands', matches: (name) => name.endsWith('.md') },
  rules: { folder: 'rules/common', matches: (name) => name.endsWith('.md') },
};

function check(id, status, detail) {
  return { id, status, detail };
}

function countEntries(root, component) {
  const folder = join(root, component.folder);
  try {
    return readdirSync(folder, { withFileTypes: true })
      .filter((entry) => component.matches(join(folder, entry.name)) &&
        (entry.isDirectory() || entry.isFile()))
      .length;
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
}

export function inspectLite(root = REPO_ROOT) {
  const fileChecks = REQUIRED_FILES.map((name) => {
    const isPresent = existsSync(join(root, name));
    return check(name, isPresent ? 'ok' : 'error',
      isPresent ? 'present' : 'missing from checkout');
  });

  let packageCheck;
  try {
    const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const isLite = manifest.name === 'frankenbrain-lite' && manifest.type === 'module';
    packageCheck = check('package', isLite ? 'ok' : 'error',
      isLite ? `frankenbrain-lite ${manifest.version ?? '(unversioned)'}` : 'unexpected package identity');
  } catch (error) {
    packageCheck = check('package', 'error', `cannot parse package.json: ${error.message}`);
  }

  const components = Object.entries(COMPONENTS).map(([name, component]) => {
    try {
      const count = countEntries(root, component);
      return { name, count, result: check(name, count > 0 ? 'ok' : 'error',
        `${count} item(s) in ${component.folder}`) };
    } catch (error) {
      return { name, count: 0, result: check(name, 'error',
        `cannot read ${component.folder}: ${error.message}`) };
    }
  });
  const counts = Object.fromEntries(components.map(({ name, count }) => [name, count]));
  const checks = [...fileChecks, packageCheck, ...components.map(({ result }) => result)];

  return { status: checks.some((item) => item.status === 'error') ? 'error' : 'ok', counts, checks };
}

export function recoveryPlan(report) {
  return report.checks.filter((item) => item.status === 'error').map((item) => {
    if (item.id === 'package') return 'Check package.json against the trusted Lite checkout.';
    return `Restore ${item.id} from the trusted Lite checkout, then rerun make check.`;
  });
}

function parseArgs(args) {
  let root = REPO_ROOT;
  let isJson = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--json') isJson = true;
    else if (args[index] === '--root' && args[index + 1]) root = resolve(args[++index]);
    else throw new Error(`Unknown or incomplete option: ${args[index]}`);
  }
  return { root, isJson };
}

export function runCli(args, io = process) {
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 2;
  }
  const report = inspectLite(options.root);
  if (options.isJson) io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    io.stdout.write(`Lite health: ${report.status}\n`);
    for (const item of report.checks) io.stdout.write(`  ${item.status}: ${item.id} — ${item.detail}\n`);
    for (const step of recoveryPlan(report)) io.stdout.write(`  recovery: ${step}\n`);
  }
  return report.status === 'ok' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli(process.argv.slice(2));
}
