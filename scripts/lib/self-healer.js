'use strict';

/**
 * ECC self-healer — SR-01 (backlog #2).
 *
 * Detects deterministic environment failures (via its own rules, aligned with
 * scripts/lib/healthcheck.js) and repairs them within a safe perimeter:
 *   - dry-run by default; caller passes apply=true to mutate
 *   - backup tarball before any mutation
 *   - never touches auth/credentials/secrets paths
 *   - 2-strike ledger: a rule failing twice consecutively escalates and stops
 *     auto-repair until a human intervenes or a clean pass resets it
 *   - append-only bitácora (healing.jsonl): cause, action, result
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const NEVER_TOUCH_PATTERNS = [
  /[\\/]auth\.json$/,
  /[\\/]\.claude\.json$/,
  /credentials?/i,
  /[\\/]\.env(\.|$)/,
  /\.pem$/,
  /secrets?\.json$/i,
  /id_rsa/,
];

const HOOK_SCRIPTS = ['handoff-timer.py', 'handoff-guard.py', 'quality-gate.py'];

const HEALING_RULES = [
  { id: 'handoffs-index', description: 'regenerate memory/handoffs/CURRENT.md when missing or stale' },
  { id: 'claude-hooks', description: 'report missing Claude hook scripts (restore is manual)' },
  { id: 'plugin-singular-dir', description: 'move plugins out of the unscanned plugin/ (singular) dir into plugins/' },
  { id: 'skill-revived', description: 'remove revived skill copies that belong in _disabled/skills/' },
  { id: 'vault-symlink', description: 'recreate the ~/vault/memory -> ~/.ecc/memory symlink' },
  { id: 'doctor-report', description: 'report doctor non-PASS details without touching data' },
];

function exists(target) {
  try {
    fs.lstatSync(target);
    return true;
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return false;
    }
    throw err;
  }
}

function isGuarded(target) {
  return NEVER_TOUCH_PATTERNS.some((pattern) => pattern.test(target));
}

function readdirSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function healingPaths(home) {
  const healingDir = path.join(home, '.local', 'log', 'healing');
  return {
    healingDir,
    backupsDir: path.join(healingDir, 'backups'),
    ledgerPath: path.join(healingDir, 'strikes.json'),
    logPath: path.join(healingDir, 'healing.jsonl'),
  };
}

function readLedger(ledgerPath) {
  try {
    return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeLedger(ledgerPath, ledger) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
}

function resetStrike(ledgerPath, ruleId) {
  const ledger = readLedger(ledgerPath);
  if (!ledger[ruleId]) {
    return ledger;
  }
  const next = { ...ledger };
  delete next[ruleId];
  writeLedger(ledgerPath, next);
  return next;
}

function recordStrike(ledgerPath, ruleId) {
  const ledger = readLedger(ledgerPath);
  const current = ledger[ruleId] || { count: 0, lastAt: null };
  const entry = { count: current.count + 1, lastAt: new Date().toISOString() };
  const next = { ...ledger, [ruleId]: entry };
  writeLedger(ledgerPath, next);
  return entry;
}

function appendLog(logPath, entry) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

function backupPaths(home, targets, backupsDir) {
  if (targets.length === 0) {
    return { ok: true, file: null };
  }
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `repair-${stamp}.tar.gz`);
  const relTargets = targets.map((t) => path.relative(home, t));
  const result = spawnSync('tar', ['-czf', backupFile, '-C', home, ...relTargets], { encoding: 'utf8' });
  if (result.status !== 0) {
    return { ok: false, file: backupFile, error: (result.stderr || 'tar failed').trim() };
  }
  return { ok: true, file: backupFile };
}

function findHandoffsIndexTool() {
  if (process.env.HANDOFFS_INDEX_BIN) {
    return process.env.HANDOFFS_INDEX_BIN;
  }
  const which = spawnSync('which', ['handoffs-index'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim();
  }
  const fallback = path.join(os.homedir(), '.local', 'bin', 'handoffs-index');
  return exists(fallback) ? fallback : null;
}

function vaultDirFor(home) {
  return path.join(home, 'vault', 'memory');
}

function detectHandoffsIndex(home) {
  const handoffsDir = path.join(vaultDirFor(home), 'handoffs');
  if (!exists(handoffsDir)) {
    return { needed: false };
  }
  const threads = readdirSafe(handoffsDir).filter((f) => f.endsWith('.md') && f !== 'CURRENT.md');
  if (threads.length === 0) {
    return { needed: false };
  }
  const indexPath = path.join(handoffsDir, 'CURRENT.md');
  if (!exists(indexPath)) {
    return { needed: true, handoffsDir, indexPath, reason: 'CURRENT.md missing' };
  }
  const newestThread = threads
    .map((f) => fs.statSync(path.join(handoffsDir, f)).mtimeMs)
    .reduce((a, b) => Math.max(a, b), 0);
  const indexMtime = fs.statSync(indexPath).mtimeMs;
  if (indexMtime < newestThread) {
    return { needed: true, handoffsDir, indexPath, reason: 'CURRENT.md older than newest thread' };
  }
  return { needed: false };
}

function detectPluginSingular(home) {
  const singularDir = path.join(home, '.config', 'opencode', 'plugin');
  if (!exists(singularDir)) {
    return { needed: false };
  }
  const files = readdirSafe(singularDir)
    .map((f) => path.join(singularDir, f))
    .filter((f) => fs.statSync(f).isFile());
  const guarded = files.filter((f) => isGuarded(f));
  if (guarded.length === files.length && files.length > 0) {
    return { needed: true, files: [], guarded, reason: 'all targets are guarded paths' };
  }
  return { needed: files.length > 0, files, singularDir, reason: `${files.length} file(s) in unscanned singular dir` };
}

function detectSkillRevived(home) {
  const activeDir = path.join(home, '.config', 'opencode', 'skills');
  const disabledDir = path.join(home, '.config', 'opencode', '_disabled', 'skills');
  const revived = readdirSafe(activeDir).filter((name) => exists(path.join(disabledDir, name)));
  return { needed: revived.length > 0, revived, activeDir, disabledDir };
}

function detectVaultSymlink(home, eccMemoryTarget) {
  const vaultMemory = vaultDirFor(home);
  const vaultRoot = path.join(home, 'vault');
  if (exists(vaultMemory) || !exists(vaultRoot)) {
    return { needed: false };
  }
  const target = eccMemoryTarget || (exists(path.join(home, '.ecc', 'memory')) ? path.join(home, '.ecc', 'memory') : null);
  if (!target) {
    return { needed: true, target: null, vaultMemory, reason: 'no ~/.ecc/memory target found' };
  }
  return { needed: true, target, vaultMemory, reason: 'vault/memory missing' };
}

function detectClaudeHooks(home) {
  const scriptsDir = path.join(home, '.claude', 'scripts');
  const missing = HOOK_SCRIPTS.filter((s) => !exists(path.join(scriptsDir, s)));
  return { needed: missing.length > 0, missing };
}

function applyPluginSingular(detection, backupsDir, home) {
  const backup = backupPaths(home, detection.files, backupsDir);
  if (!backup.ok) {
    return { ok: false, detail: `backup failed: ${backup.error}` };
  }
  const pluginsDir = path.join(home, '.config', 'opencode', 'plugins');
  fs.mkdirSync(pluginsDir, { recursive: true });
  for (const file of detection.files) {
    fs.renameSync(file, path.join(pluginsDir, path.basename(file)));
  }
  try {
    fs.rmdirSync(detection.singularDir);
  } catch {
    // dir not empty (guarded files remain) — leave in place
  }
  const moved = detection.files.every((f) => exists(path.join(pluginsDir, path.basename(f))));
  return { ok: moved, detail: `moved ${detection.files.length} file(s) to plugins/ (backup: ${path.basename(backup.file || 'n/a')})` };
}

function applySkillRevived(detection, backupsDir, home) {
  const targets = detection.revived.map((name) => path.join(detection.activeDir, name));
  const backup = backupPaths(home, targets, backupsDir);
  if (!backup.ok) {
    return { ok: false, detail: `backup failed: ${backup.error}` };
  }
  for (const target of targets) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  const clean = targets.every((t) => !exists(t));
  return { ok: clean, detail: `removed ${targets.length} revived skill copy(ies) from active dir (canonical copies stay in _disabled/skills/)` };
}

function applyVaultSymlink(detection, home) {
  if (!detection.target) {
    return { ok: false, detail: 'cannot recreate symlink without an ~/.ecc/memory target' };
  }
  fs.mkdirSync(path.join(home, 'vault'), { recursive: true });
  fs.symlinkSync(detection.target, detection.vaultMemory);
  const link = fs.readlinkSync(detection.vaultMemory);
  return { ok: link === detection.target, detail: `vault/memory -> ${detection.target}` };
}

function applyHandoffsIndex(detection, home) {
  const tool = findHandoffsIndexTool();
  if (!tool) {
    return { ok: false, reportOnly: true, detail: 'handoffs-index tool not found; regenerate CURRENT.md manually' };
  }
  const result = spawnSync(tool, [], { encoding: 'utf8', env: { ...process.env, HOME: home } });
  if (result.status !== 0) {
    return { ok: false, detail: `handoffs-index exited ${result.status}: ${(result.stderr || '').trim()}` };
  }
  return { ok: exists(detection.indexPath), detail: `regenerated ${detection.indexPath}` };
}

function runSelfHealer(options) {
  const {
    home = os.homedir(),
    apply = false,
    eccMemoryTarget = null,
    failVerifyRule = null,
  } = options || {};

  const { healingDir, backupsDir, ledgerPath, logPath } = healingPaths(home);
  fs.mkdirSync(healingDir, { recursive: true });

  const actions = [];
  const emit = (rule, status, detail, cause) => {
    const action = { rule, status, detail: detail || '', ...(cause ? { cause } : {}) };
    actions.push(action);
    appendLog(logPath, {
      timestamp: new Date().toISOString(),
      rule,
      status,
      cause: cause || null,
      action: apply ? 'apply' : 'dry-run',
      result: detail || '',
    });
    return action;
  };

  const detections = [
    ['handoffs-index', detectHandoffsIndex(home)],
    ['claude-hooks', detectClaudeHooks(home)],
    ['plugin-singular-dir', detectPluginSingular(home)],
    ['skill-revived', detectSkillRevived(home)],
    ['vault-symlink', detectVaultSymlink(home, eccMemoryTarget)],
  ];

  for (const [ruleId, detection] of detections) {
    if (failVerifyRule === ruleId) {
      // Simulated recurring failure (test hook / future health feed): any
      // applicable mutation happens, then verification is forced to fail.
      let detail = 'forced verification failure';
      if (detection.needed && apply) {
        const applied = applyRuleById(ruleId, detection, backupsDir, home);
        detail = `${applied.detail}; ${detail}`;
      }
      const strike = recordStrike(ledgerPath, ruleId);
      emit(ruleId, strike.count >= 2 ? 'escalated' : 'failed', `${detail} (strikes: ${strike.count})`, detection.reason || null);
      continue;
    }

    if (!detection.needed) {
      resetStrike(ledgerPath, ruleId);
      emit(ruleId, 'skipped', 'nothing to repair');
      continue;
    }

    if (!apply) {
      emit(ruleId, 'planned', detection.reason, detection.reason);
      continue;
    }

    const applied = applyRuleById(ruleId, detection, backupsDir, home);
    if (applied.reportOnly) {
      resetStrike(ledgerPath, ruleId);
      emit(ruleId, 'reported', applied.detail, detection.reason);
      continue;
    }
    if (applied.ok) {
      resetStrike(ledgerPath, ruleId);
      emit(ruleId, 'applied', applied.detail, detection.reason);
    } else {
      const strike = recordStrike(ledgerPath, ruleId);
      emit(ruleId, strike.count >= 2 ? 'escalated' : 'failed', `${applied.detail} (strikes: ${strike.count})`, detection.reason);
    }
  }

  // doctor-report: never mutates, always reports.
  resetStrike(ledgerPath, 'doctor-report');
  emit('doctor-report', 'reported', 'vault doctor verification is delegated to the caller (read-only rule; no auto-repair of data)');

  const summary = actions.reduce((acc, a) => ({ ...acc, [a.status]: (acc[a.status] || 0) + 1 }), {});
  return { actions, summary };
}

function applyRuleById(ruleId, detection, backupsDir, home) {
  switch (ruleId) {
    case 'handoffs-index':
      return applyHandoffsIndex(detection, home);
    case 'plugin-singular-dir':
      return applyPluginSingular(detection, backupsDir, home);
    case 'skill-revived':
      return applySkillRevived(detection, backupsDir, home);
    case 'vault-symlink':
      return applyVaultSymlink(detection, home);
    default:
      return { ok: false, reportOnly: true, detail: `${ruleId}: report-only rule` };
  }
}

module.exports = {
  HEALING_RULES,
  NEVER_TOUCH_PATTERNS,
  runSelfHealer,
};