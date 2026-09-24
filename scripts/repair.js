#!/usr/bin/env node

const os = require('os');
const { repairInstalledStates } = require('./lib/install-lifecycle');
const { SUPPORTED_INSTALL_TARGETS } = require('./lib/install-manifests');
const { problemReportLines } = require('./lib/feedback-links');
const { runSelfHealer } = require('./lib/self-healer');

function showHelp(exitCode = 0) {
  console.log(`
Usage: node scripts/repair.js [--target <${SUPPORTED_INSTALL_TARGETS.join('|')}>] [--dry-run] [--json] [--auto [--apply]]

Rebuild ECC-managed files recorded in install-state for the current context.

Self-healer mode (--auto, SR-01): runs the deterministic healing rules
(handoffs-index, claude-hooks, plugin-singular-dir, skill-revived,
vault-symlink, doctor-report). Dry-run by default; pass --apply to execute
repairs. Backs up every mutation, never touches auth/credentials/secrets,
escalates to a human after two consecutive failures of the same rule.
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    targets: [],
    dryRun: false,
    json: false,
    help: false,
    auto: false,
    apply: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--target') {
      parsed.targets.push(args[index + 1] || null);
      index += 1;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (arg === '--auto') {
      parsed.auto = true;
    } else if (arg === '--apply') {
      parsed.apply = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHuman(result) {
  if (result.results.length === 0) {
    console.log('No ECC install-state files found for the current home/project context.');
    return;
  }

  console.log('Repair summary:\n');
  for (const entry of result.results) {
    console.log(`- ${entry.adapter.id}`);
    console.log(`  Status: ${entry.status.toUpperCase()}`);
    console.log(`  Install-state: ${entry.installStatePath}`);

    if (entry.error) {
      console.log(`  Error: ${entry.error}`);
      continue;
    }

    const paths = result.dryRun ? entry.plannedRepairs : entry.repairedPaths;
    console.log(`  ${result.dryRun ? 'Planned repairs' : 'Repaired paths'}: ${paths.length}`);
  }

  console.log(`\nSummary: checked=${result.summary.checkedCount}, ${result.dryRun ? 'planned' : 'repaired'}=${result.dryRun ? result.summary.plannedRepairCount : result.summary.repairedCount}, errors=${result.summary.errorCount}`);

  if (result.summary.errorCount > 0) {
    console.log(`\n${problemReportLines().join('\n')}`);
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv);
    if (options.help) {
      showHelp(0);
    }

    if (options.auto) {
      const home = process.env.HOME || os.homedir();
      const healed = runSelfHealer({ home, apply: options.apply });
      if (options.json) {
        console.log(JSON.stringify(healed, null, 2));
      } else {
        console.log(`Self-healer ${options.apply ? 'apply' : 'dry-run'} report:\n`);
        for (const action of healed.actions) {
          console.log(`- [${String(action.status).toUpperCase()}] ${action.rule}${action.detail ? `: ${action.detail}` : ''}`);
        }
        console.log(`\nSummary: ${JSON.stringify(healed.summary)}`);
      }
      const needsHuman = (healed.summary.failed || 0) > 0 || (healed.summary.escalated || 0) > 0;
      process.exitCode = needsHuman ? 1 : 0;
      return;
    }

    const result = repairInstalledStates({
      repoRoot: require('path').join(__dirname, '..'),
      homeDir: process.env.HOME || os.homedir(),
      projectRoot: process.cwd(),
      targets: options.targets,
      dryRun: options.dryRun,
    });
    if (!options.dryRun) {
      const { reconcileCanonicalInstallStates } = require('./lib/install-state-store-sync');
      result.installStateProjection = await reconcileCanonicalInstallStates({
        homeDir: process.env.HOME || os.homedir(),
        projectRoot: process.cwd(),
        targets: options.targets,
      });
    }
    const hasErrors = result.summary.errorCount > 0;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHuman(result);
    }

    process.exitCode = hasErrors ? 1 : 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
