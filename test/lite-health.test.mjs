import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { inspectLite, recoveryPlan, runCli } from '../scripts/lite-health.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lite-health-'));
  const files = {
    'package.json': JSON.stringify({ name: 'frankenbrain-lite', type: 'module' }),
    'README.md': '# Lite',
    'AGENTS.md': '# Rules',
    'gemini-extension.json': '{}',
    'scripts/security-gate.sh': '#!/bin/sh\n',
    'scripts/validate.sh': '#!/bin/sh\n',
    'skills/example/SKILL.md': '---\nname: example\ndescription: Example skill\n---\n',
    'agents/example.md': '# Agent',
    'commands/example.md': '# Command',
    'rules/common/example.md': '# Rule',
  };
  for (const [name, content] of Object.entries(files)) {
    const target = join(root, name);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('healthy Lite layout reports component counts without changing files', () => {
  const { root, cleanup } = fixture();
  try {
    const before = readFileSync(join(root, 'package.json'), 'utf8');
    const report = inspectLite(root);
    assert.equal(report.status, 'ok');
    assert.deepEqual(report.counts, { skills: 1, agents: 1, commands: 1, rules: 1 });
    assert.deepEqual(recoveryPlan(report), []);
    assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), before);
  } finally {
    cleanup();
  }
});

test('missing component and malformed package produce actionable failures', () => {
  const { root, cleanup } = fixture();
  try {
    rmSync(join(root, 'scripts/validate.sh'));
    writeFileSync(join(root, 'package.json'), '{bad json');
    const report = inspectLite(root);
    assert.equal(report.status, 'error');
    assert.ok(report.checks.some((check) => check.id === 'package' && check.status === 'error'));
    assert.ok(report.checks.some((check) => check.id === 'scripts/validate.sh' && check.status === 'error'));
    assert.ok(recoveryPlan(report).every((step) => !step.includes('rm ')));
  } finally {
    cleanup();
  }
});

test('CLI reports JSON, recovery steps, and invalid options with distinct exit codes', () => {
  const { root, cleanup } = fixture();
  let output = '';
  let errors = '';
  const io = {
    stdout: { write: (chunk) => { output += chunk; } },
    stderr: { write: (chunk) => { errors += chunk; } },
  };
  try {
    assert.equal(runCli(['--root', root, '--json'], io), 0);
    assert.equal(JSON.parse(output).status, 'ok');
    output = '';
    rmSync(join(root, 'README.md'));
    assert.equal(runCli(['--root', root], io), 1);
    assert.match(output, /recovery: Restore README.md/);
    assert.equal(runCli(['--unknown'], io), 2);
    assert.match(errors, /Unknown or incomplete option/);
  } finally {
    cleanup();
  }
});
