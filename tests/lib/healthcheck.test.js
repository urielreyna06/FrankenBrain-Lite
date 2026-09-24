/**
 * Tests for ECC healthchecks (#1 in vault backlog)
 *
 * Run with: node tests/lib/healthcheck.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, banner, summary } = require('./helpers/mini-test-runner');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { CHECK_SCOPES, runHealthchecks } = require(path.join(REPO_ROOT, 'scripts', 'lib', 'healthcheck'));

const HOME = process.env.HOME || os.homedir();

function inTempRoot(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-healthcheck-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

banner('Healthchecks: scope definitions');

let passed = 0;
let failed = 0;

if (test('CHECK_SCOPES exactly matches the backlog (hooks|plugins|skills|mcp|vault|learning|all)', () => {
  assert.deepStrictEqual(
    CHECK_SCOPES,
    ['hooks', 'plugins', 'skills', 'mcp', 'vault', 'learning', 'all'],
  );
})) passed++; else failed++;

if (test('rejects an unknown scope with a thrown Error', () => {
  inTempRoot(() => {
    assert.throws(() => runHealthchecks({ scopes: ['nonexistent-scope'], home: HOME, outputFormat: 'json' }), /unknown scope/i);
  });
})) passed++; else failed++;

banner('Healthchecks: hooks scope');

if (test('hooks PASS when handoff-timer.py + handoff-guard.py + quality-gate.py exist', () => {
  inTempRoot((tmp) => {
    const scriptsDir = path.join(tmp, '.claude', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, 'handoff-timer.py'), '# ok\n');
    fs.writeFileSync(path.join(scriptsDir, 'handoff-guard.py'), '# ok\n');
    fs.writeFileSync(path.join(scriptsDir, 'quality-gate.py'), '# ok\n');
    const result = runHealthchecks({ scopes: ['hooks'], home: tmp, outputFormat: 'json' });
    const hooks = result.results.find((r) => r.scope === 'hooks');
    assert.strictEqual(hooks.status, 'ok');
    assert.strictEqual(hooks.checks.every((c) => c.status === 'ok'), true);
  });
})) passed++; else failed++;

if (test('hooks ERROR when a required script is missing', () => {
  inTempRoot((tmp) => {
    const result = runHealthchecks({ scopes: ['hooks'], home: tmp, outputFormat: 'json' });
    const hooks = result.results.find((r) => r.scope === 'hooks');
    assert.strictEqual(hooks.status, 'error');
    assert.ok(hooks.checks.some((c) => c.status === 'error'));
  });
})) passed++; else failed++;

banner('Healthchecks: plugins scope');

if (test('plugins PASS when ecc-learning.ts + handoff-timer.js in plugins/ (plural), no singular plugin dir', () => {
  inTempRoot((tmp) => {
    const pluginsDir = path.join(tmp, '.config', 'opencode', 'plugins');
    fs.mkdirSync(pluginsDir, { recursive: true });
    fs.writeFileSync(path.join(pluginsDir, 'ecc-learning.ts'), 'export const meta = {};\n');
    fs.writeFileSync(path.join(pluginsDir, 'handoff-timer.js'), 'module.exports = {};\n');
    const result = runHealthchecks({ scopes: ['plugins'], home: tmp, outputFormat: 'json' });
    const plugins = result.results.find((r) => r.scope === 'plugins');
    assert.strictEqual(plugins.status, 'ok');
  });
})) passed++; else failed++;

if (test('plugins ERROR asserts handoff-timer.js is an installable file and reports singular dir usage', () => {
  inTempRoot((tmp) => {
    const singularDir = path.join(tmp, '.config', 'opencode', 'plugin');
    fs.mkdirSync(singularDir, { recursive: true });
    fs.writeFileSync(path.join(singularDir, 'handoff-timer.js'), 'module.exports = {};\n');
    const result = runHealthchecks({ scopes: ['plugins'], home: tmp, outputFormat: 'json' });
    const plugins = result.results.find((r) => r.scope === 'plugins');
    assert.strictEqual(plugins.status, 'error');
    const handoff = plugins.checks.find((c) => c.id === 'handoff-timer-in-plugins');
    assert.strictEqual(handoff.status, 'error');
    assert.match(handoff.detail, /singular.*plugin/i);
  });
})) passed++; else failed++;

banner('Healthchecks: skills scope');

if (test('skills PASS when no duplicate skill copies exist in active config dir', () => {
  inTempRoot((tmp) => {
    const skillsDir = path.join(tmp, '.config', 'opencode', 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'foo'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'foo', 'SKILL.md'), '# foo\n');
    const result = runHealthchecks({ scopes: ['skills'], home: tmp, outputFormat: 'json' });
    const skills = result.results.find((r) => r.scope === 'skills');
    assert.strictEqual(skills.status, 'ok');
  });
})) passed++; else failed++;

banner('Healthchecks: vault scope & output shapes');

if (test('vault scope returns a result with ok or error but never throws when dirs absent', () => {
  inTempRoot((tmp) => {
    const result = runHealthchecks({ scopes: ['vault'], home: tmp, outputFormat: 'json' });
    const vault = result.results.find((r) => r.scope === 'vault');
    assert.ok(vault);
    assert.ok(vault.checks.length > 0);
  });
})) passed++; else failed++;

if (test('default scopes = all concrete scopes (meta "all" is not a result row) and summary aggregates counts', () => {
  inTempRoot((tmp) => {
    const result = runHealthchecks({ home: tmp, outputFormat: 'json' });
    assert.strictEqual(result.results.length, CHECK_SCOPES.length - 1);
    assert.ok(typeof result.summary.okCount === 'number');
    assert.strictEqual(result.summary.okCount + result.summary.errorCount + result.summary.warningCount, result.summary.checkedCount);
  });
})) passed++; else failed++;

if (test('explicit --scope all behaves identically to the default (no args)', () => {
  inTempRoot((tmp) => {
    const allResult = runHealthchecks({ scopes: ['all'], home: tmp, outputFormat: 'json' });
    const defaultResult = runHealthchecks({ home: tmp, outputFormat: 'json' });
    assert.strictEqual(allResult.results.length, defaultResult.results.length);
  });
})) passed++; else failed++;

summary(passed, failed);