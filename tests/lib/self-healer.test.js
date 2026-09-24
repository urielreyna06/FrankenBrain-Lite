/**
 * Tests for ECC self-healer (backlog #2, SR-01)
 *
 * Run with: node tests/lib/self-healer.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, banner, summary } = require('./helpers/mini-test-runner');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { runSelfHealer, NEVER_TOUCH_PATTERNS, HEALING_RULES } = require(path.join(REPO_ROOT, 'scripts', 'lib', 'self-healer'));

function makeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-selfhealer-'));
  return {
    home,
    healingDir: path.join(home, '.local', 'log', 'healing'),
    cleanup: () => fs.rmSync(home, { recursive: true, force: true }),
  };
}

function write(filePath, content = 'x') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function resultOf(actions, ruleId) {
  return actions.find((a) => a.rule === ruleId);
}

banner('Self-healer: rule definitions');

let passed = 0;
let failed = 0;

if (test('HEALING_RULES covers the six backlog rules', () => {
  const ids = HEALING_RULES.map((r) => r.id);
  assert.ok(ids.includes('handoffs-index'));
  assert.ok(ids.includes('claude-hooks'));
  assert.ok(ids.includes('plugin-singular-dir'));
  assert.ok(ids.includes('skill-revived'));
  assert.ok(ids.includes('vault-symlink'));
  assert.ok(ids.includes('doctor-report'));
})) passed++; else failed++;

if (test('NEVER_TOUCH_PATTERNS blocks auth, credentials, env and secrets', () => {
  assert.ok(NEVER_TOUCH_PATTERNS.some((p) => p.test('/home/u/.local/share/opencode/auth.json')));
  assert.ok(NEVER_TOUCH_PATTERNS.some((p) => p.test('/home/u/.claude.json')));
  assert.ok(NEVER_TOUCH_PATTERNS.some((p) => p.test('/home/u/project/.env')));
  assert.ok(!NEVER_TOUCH_PATTERNS.some((p) => p.test('/home/u/.config/opencode/plugins/handoff-timer.js')));
})) passed++; else failed++;

banner('Self-healer: dry-run never mutates');

if (test('dry-run plans the plugin move but leaves the singular dir untouched', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    const out = runSelfHealer({ home: ctx.home, apply: false });
    const action = resultOf(out.actions, 'plugin-singular-dir');
    assert.strictEqual(action.status, 'planned');
    assert.ok(fs.existsSync(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js')));
    assert.ok(!fs.existsSync(path.join(ctx.home, '.config', 'opencode', 'plugins', 'handoff-timer.js')));
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

banner('Self-healer: apply performs safe repairs');

if (test('apply moves a plugin out of the singular dir into plugins/', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    const out = runSelfHealer({ home: ctx.home, apply: true });
    const action = resultOf(out.actions, 'plugin-singular-dir');
    assert.strictEqual(action.status, 'applied');
    assert.ok(fs.existsSync(path.join(ctx.home, '.config', 'opencode', 'plugins', 'handoff-timer.js')));
    assert.ok(!fs.existsSync(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js')));
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('apply removes a revived skill copy from the active dir after backing it up', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'skills', 'foo', 'SKILL.md'), 'active copy');
    write(path.join(ctx.home, '.config', 'opencode', '_disabled', 'skills', 'foo', 'SKILL.md'), 'canonical copy');
    const out = runSelfHealer({ home: ctx.home, apply: true });
    const action = resultOf(out.actions, 'skill-revived');
    assert.strictEqual(action.status, 'applied');
    assert.ok(!fs.existsSync(path.join(ctx.home, '.config', 'opencode', 'skills', 'foo')));
    assert.strictEqual(
      fs.readFileSync(path.join(ctx.home, '.config', 'opencode', '_disabled', 'skills', 'foo', 'SKILL.md'), 'utf8'),
      'canonical copy',
    );
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('apply recreates a broken vault memory symlink pointing at ~/.ecc/memory', () => {
  const ctx = makeHome();
  try {
    const eccMemory = path.join(ctx.home, '.ecc', 'memory');
    fs.mkdirSync(eccMemory, { recursive: true });
    fs.mkdirSync(path.join(ctx.home, 'vault'), { recursive: true });
    const out = runSelfHealer({ home: ctx.home, apply: true, eccMemoryTarget: eccMemory });
    const action = resultOf(out.actions, 'vault-symlink');
    assert.strictEqual(action.status, 'applied');
    const link = fs.readlinkSync(path.join(ctx.home, 'vault', 'memory'));
    assert.strictEqual(link, eccMemory);
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('handoffs-index rule skips cleanly when no handoffs dir exists', () => {
  const ctx = makeHome();
  try {
    const out = runSelfHealer({ home: ctx.home, apply: true });
    const action = resultOf(out.actions, 'handoffs-index');
    assert.strictEqual(action.status, 'skipped');
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('doctor-report rule never mutates and always reports', () => {
  const ctx = makeHome();
  try {
    const out = runSelfHealer({ home: ctx.home, apply: true });
    const action = resultOf(out.actions, 'doctor-report');
    assert.strictEqual(action.status, 'reported');
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

banner('Self-healer: never-touch guard');

if (test('a rule targeting an auth file is refused, not repaired', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.local', 'share', 'opencode', 'auth.json'), 'SECRET');
    const out = runSelfHealer({ home: ctx.home, apply: true });
    assert.ok(out.actions.every((a) => a.status !== 'applied' || !String(a.detail || '').includes('auth.json')));
    assert.strictEqual(fs.readFileSync(path.join(ctx.home, '.local', 'share', 'opencode', 'auth.json'), 'utf8'), 'SECRET');
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

banner('Self-healer: 2-strike escalation');

if (test('two consecutive failed verifications for the same rule escalate and stop auto-repair', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    const first = runSelfHealer({ home: ctx.home, apply: true, failVerifyRule: 'plugin-singular-dir' });
    assert.strictEqual(resultOf(first.actions, 'plugin-singular-dir').status, 'failed');
    const second = runSelfHealer({ home: ctx.home, apply: true, failVerifyRule: 'plugin-singular-dir' });
    assert.strictEqual(resultOf(second.actions, 'plugin-singular-dir').status, 'escalated');
    const ledger = JSON.parse(fs.readFileSync(path.join(ctx.healingDir, 'strikes.json'), 'utf8'));
    assert.strictEqual(ledger['plugin-singular-dir'].count, 2);
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('a successful repair resets the strike ledger for that rule', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    runSelfHealer({ home: ctx.home, apply: true, failVerifyRule: 'plugin-singular-dir' });
    const ok = runSelfHealer({ home: ctx.home, apply: true });
    assert.strictEqual(resultOf(ok.actions, 'plugin-singular-dir').status, 'skipped');
    const ledger = JSON.parse(fs.readFileSync(path.join(ctx.healingDir, 'strikes.json'), 'utf8'));
    assert.ok(!ledger['plugin-singular-dir'] || ledger['plugin-singular-dir'].count === 0);
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

banner('Self-healer: bitácora and backups');

if (test('apply writes a cause-action-result entry to the healing log', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    runSelfHealer({ home: ctx.home, apply: true });
    const logFiles = fs.readdirSync(ctx.healingDir).filter((f) => f.endsWith('.jsonl'));
    assert.strictEqual(logFiles.length, 1);
    const entries = fs.readFileSync(path.join(ctx.healingDir, logFiles[0]), 'utf8')
      .split('\n').filter((l) => l.trim());
    assert.ok(entries.some((e) => JSON.parse(e).rule === 'plugin-singular-dir'));
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

if (test('apply creates a backup archive before mutating files', () => {
  const ctx = makeHome();
  try {
    write(path.join(ctx.home, '.config', 'opencode', 'plugin', 'handoff-timer.js'));
    runSelfHealer({ home: ctx.home, apply: true });
    const backups = fs.readdirSync(path.join(ctx.healingDir, 'backups'));
    assert.ok(backups.some((f) => f.endsWith('.tar.gz')));
  } finally {
    ctx.cleanup();
  }
})) passed++; else failed++;

summary(passed, failed);