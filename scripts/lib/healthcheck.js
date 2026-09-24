'use strict';

/**
 * ECC healthchecks — deterministic, read-only environment validation.
 *
 * Backlog #1, HP-01. Never mutates state; emits structured results that a
 * consumer (cron, self-healer, human) can act on with exit-code semantics:
 *   exit 0 = pass, exit 1 = error, exit 2 = warning.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const CHECK_SCOPES = ['hooks', 'plugins', 'skills', 'mcp', 'vault', 'learning', 'all'];

const HOOK_SCRIPTS = ['handoff-timer.py', 'handoff-guard.py', 'quality-gate.py'];
const PLUGIN_NAMES = ['ecc-learning.ts', 'handoff-timer.js'];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function tryReadObservations(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter((line) => line.trim().length > 0);
    return { ok: true, count: lines.length, path: filePath };
  } catch (err) {
    return { ok: false, path: filePath, error: String(err && err.message ? err.message : err) };
  }
}

function readdir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function check(entry, id, status, detail) {
  return { id, status, ...(detail ? { detail } : {}) };
}

function pluginsCheck(home) {
  const configRoot = path.join(home, '.config', 'opencode', 'plugins');
  const singularRoot = path.join(home, '.config', 'opencode', 'plugin');
  const entries = [];
  let status = 'ok';

  for (const name of PLUGIN_NAMES) {
    const candidate = path.join(configRoot, name);
    if (exists(candidate)) {
      entries.push(check(entries, `plugin-${name}`, 'ok', `${name} present in plugins/`));
    } else {
      status = 'error';
      entries.push(check(entries, `plugin-${name}`, 'error', `${name} missing from plugins/`));
    }
  }

  if (exists(singularRoot)) {
    status = 'error';
    entries.push(
      check(entries, 'handoff-timer-in-plugins', 'error', 'singular plugin/ dir still exists; only plugins/ (plural) is scanned by opencode'),
    );
  } else if (!entries.some((e) => e.id === 'handoff-timer-in-plugins')) {
    entries.push(check(entries, 'handoff-timer-in-plugins', 'ok', 'no singular plugin/ dir'));
  }

  return { scope: 'plugins', status, checks: entries };
}

function hooksCheck(home) {
  const scriptsDir = path.join(home, '.claude', 'scripts');
  const entries = [];
  let status = 'ok';

  for (const script of HOOK_SCRIPTS) {
    if (exists(path.join(scriptsDir, script))) {
      entries.push(check(entries, `hook-${script}`, 'ok', `${script} present`));
    } else {
      let status = 'error';
      entries.push(check(entries, `hook-${script}`, status, `${script} missing`));
    }
  }
  if (entries.length > 0 && entries.every((e) => e.status === 'ok')) {
    status = 'ok';
  } else {
    status = entries.some((e) => e.status === 'error') ? 'error' : 'ok';
  }

  return { scope: 'hooks', status, checks: entries };
}

function skillsCheck(home) {
  const activeDir = path.join(home, '.config', 'opencode', 'skills');
  const disabledDir = path.join(home, '.config', 'opencode', '_disabled', 'skills');
  const entries = [];
  const activeNames = readdir(activeDir);
  const disabledNames = readdir(disabledDir);

  const activeOnly = activeNames.filter((name) => !disabledNames.includes(name));
  const revived = activeNames.filter((name) => disabledNames.includes(name));

  let status = 'ok';
  entries.push(
    check(entries, 'active-skills', 'ok', `${activeNames.length} active, ${disabledNames.length} disabled`),
  );

  if (revived.length > 0) {
    status = 'error';
    entries.push(check(entries, 'duplicate-skills', 'error', `disabled skills revived into active dir: ${revived.join(', ')}; move them back to _disabled/skills/`));
  } else {
    entries.push(check(entries, 'duplicate-skills', 'ok', 'no disabled skill revived into active dir'));
  }
  if (activeOnly.length === 0) {
    entries.push(check(entries, 'active-only-skills', 'ok', 'no active-only additions'));
  }

  return { scope: 'skills', status, checks: entries };
}

function vaultCheck(home) {
  const candidateVault = path.join(home, 'vault', 'memory');
  const fallbackVault = path.join(os.homedir(), 'vault', 'memory');
  const vaultDir = exists(candidateVault) ? candidateVault : fallbackVault;
  const entries = [];
  const handoffsDir = path.join(vaultDir, 'handoffs');

  let status = 'ok';
  entries.push(check(entries, 'vault-dir', exists(vaultDir) ? 'ok' : 'error', exists(vaultDir) ? vaultDir : 'no vault/memory found'));

  if (exists(vaultDir)) {
    if (exists(handoffsDir)) {
      const threads = readdir(handoffsDir).filter((f) => f.endsWith('.md') && f !== 'CURRENT.md');
      entries.push(check(entries, 'handoffs-index', 'ok', `${threads.length} handoff threads indexed`));
    } else {
      status = 'error';
      entries.push(check(entries, 'handoffs-index', 'error', 'handoffs dir missing from vault'));
    }
  } else {
    status = 'error';
  }

  return { scope: 'vault', status, checks: entries };
}

function mcpCheck() {
  // MCP is network-dependent; absence of local config is not an error but a
  // warning, to align with "a broken component is detected, not assumed".
  return {
    scope: 'mcp',
    status: 'warning',
    checks: [check(null, 'mcp-live-probe', 'warning', 'MCP servers are configured per-harness; live connectivity is verified by the self-healer at repair time')],
  };
}

function learningCheck(home) {
  const entries = [];
  const homunculusObs = path.join(home, '.local', 'share', 'ecc-homunculus', 'observations.jsonl');
  const obsInfo = tryReadObservations(homunculusObs);

  let status = 'ok';
  if (obsInfo.ok) {
    entries.push(check(entries, 'learning-observations', 'ok', `${obsInfo.count} observations in ${obsInfo.path}`));
  } else {
    status = 'error';
    entries.push(check(entries, 'learning-observations', 'error', `no observations store at ${homunculusObs}: ${obsInfo.error}`));
  }

  entries.push(check(
    entries,
    'learning-store-locator',
    exists(homunculusObs) ? 'ok' : 'warning',
    exists(homunculusObs) ? homunculusObs : 'ecc-homunculus observations store not found',
  ));

  return { scope: 'learning', status, checks: entries };
}

function runAllChecks({ home, scopes }) {
  const selectedScopes = expandScopes(scopes);

  const results = [];
  for (const scope of selectedScopes) {
    switch (scope) {
      case 'hooks':
        results.push(hooksCheck(home));
        break;
      case 'plugins':
        results.push(pluginsCheck(home));
        break;
      case 'skills':
        results.push(skillsCheck(home));
        break;
      case 'vault':
        results.push(vaultCheck(home));
        break;
      case 'mcp':
        results.push(mcpCheck());
        break;
      case 'learning':
        results.push(learningCheck(home));
        break;
      default:
        throw new Error(`Unknown scope: ${scope}`);
    }
  }

  const checks = results.flatMap((r) => r.checks);
  const okCount = checks.filter((c) => c.status === 'ok').length;
  const errorCount = checks.filter((c) => c.status === 'error').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const overall = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok';

  return {
    scope: 'all',
    status: overall,
    results,
    summary: {
      checkedCount: checks.length,
      okCount,
      errorCount,
      warningCount,
    },
  };
}

function expandScopes(scopes) {
  if (scopes.length === 0 || scopes.includes('all')) {
    return CHECK_SCOPES.filter((s) => s !== 'all');
  }
  return scopes;
}

function runHealthchecks({ scopes = [], home = os.homedir(), outputFormat = 'json' }) {
  const selected = expandScopes(scopes);

  for (const scope of selected) {
    if (!CHECK_SCOPES.includes(scope)) {
      throw new Error(`Unknown scope: ${scope}`);
    }
  }

  const report = runAllChecks({ home, scopes: selected });

  if (outputFormat === 'json') {
    return report;
  }

  const lines = [`Healthcheck of ${report.summary.checkedCount} checks: ${report.summary.okCount} ok, ${report.summary.warningCount} warning, ${report.summary.errorCount} error.`];
  for (const result of report.results) {
    lines.push(`[${result.status.toUpperCase()}] ${result.scope}`);
    for (const entry of result.checks) {
      lines.push(`  [${entry.status.toUpperCase()}] ${entry.id}: ${entry.detail || ''}`);
    }
  }
  return {
    report,
    text: lines.join('\n'),
  };
}

module.exports = {
  CHECK_SCOPES,
  HOOK_SCRIPTS,
  PLUGIN_NAMES,
  runHealthchecks,
};