#!/usr/bin/env node
// SessionStart enrichment hook for the deployment-heartbeat spike.
//
// - Reads the SessionStart event JSON from stdin (what Claude Code feeds in).
// - Reads ${CLAUDE_PLUGIN_ROOT}/packmind.json sidecar.
// - Shells out for git remote + branch + HEAD (best-effort, null if not a repo).
// - Reads ${CLAUDE_PROJECT_DIR}/.claude/settings.json + ~/.claude/settings.json
//   to enumerate declared/enabled plugins (project- vs user-level).
// - Reads ~/.claude/plugins/installed_plugins.json (canonical install ledger)
//   and ~/.claude/plugins/known_marketplaces.json to enumerate installed plugins
//   and the marketplaces they came from. Hydrates each install with its
//   plugin.json manifest from installPath when readable.
// - POSTs the enriched envelope to the spike receiver.
// - Exits 0 unconditionally so Claude Code never shows a hook-error notice.
//
// All values are sent UNHASHED. This is intentional for the spike: localhost-only
// receiver, the human needs to inspect raw values. Production must hash repo + email.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { request } from 'node:http';

// Hardcoded at render time. Renderer will substitute these per (deployment,plugin,version).
const RECEIVER_URL = 'http://127.0.0.1:8765/api/v1/plugin-telemetry/spike-deployment-001/heartbeat-demo/spike-fake-sha-001/session-start';

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const git = (cwd, args) =>
  execFileSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 1000,
  })
    .toString()
    .trim();

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const hookPayload = safe(
  () => JSON.parse(readFileSync(0, 'utf8')),
  { _note: 'no stdin or non-JSON' },
);

const sidecar = pluginRoot
  ? safe(() => readJson(join(pluginRoot, 'packmind.json')), null)
  : null;

const gitInfo = {
  remote_origin: safe(() => git(projectDir, ['remote', 'get-url', 'origin']), null),
  branch: safe(() => git(projectDir, ['rev-parse', '--abbrev-ref', 'HEAD']), null),
  head_sha: safe(() => git(projectDir, ['rev-parse', 'HEAD']), null),
  user_email: safe(() => git(projectDir, ['config', 'user.email']), null),
};

const readSettings = (settingsPath) => {
  if (!existsSync(settingsPath)) return { path: settingsPath, exists: false };
  const parsed = safe(() => readJson(settingsPath), null);
  if (!parsed) return { path: settingsPath, exists: true, parse_error: true };
  return {
    path: settingsPath,
    exists: true,
    enabledPlugins: Object.keys(parsed.enabledPlugins || {}),
    extraKnownMarketplaces: Object.keys(parsed.extraKnownMarketplaces || {}),
    disableAllHooks: parsed.disableAllHooks === true,
  };
};

const projectSettings = readSettings(join(projectDir, '.claude', 'settings.json'));
const userSettings = readSettings(join(homedir(), '.claude', 'settings.json'));

const enumerateInstalledPlugins = () => {
  const pluginsRoot = join(homedir(), '.claude', 'plugins');
  const ledgerPath = join(pluginsRoot, 'installed_plugins.json');
  const marketplacesPath = join(pluginsRoot, 'known_marketplaces.json');

  const ledger = safe(() => readJson(ledgerPath), null);
  const marketplacesIndex = safe(() => readJson(marketplacesPath), null);

  // Hydrate each install with its plugin.json manifest if reachable.
  const hydrated = [];
  if (ledger && ledger.plugins) {
    for (const [pluginKey, installs] of Object.entries(ledger.plugins)) {
      for (const inst of installs) {
        const manifestCandidates = [
          inst.installPath && join(inst.installPath, '.claude-plugin', 'plugin.json'),
          inst.installPath && join(inst.installPath, '.claude-plugin', 'marketplace.json'),
        ].filter(Boolean);
        let manifest = null;
        let manifestPath = null;
        for (const cand of manifestCandidates) {
          if (existsSync(cand)) {
            manifest = safe(() => readJson(cand), null);
            manifestPath = cand;
            break;
          }
        }
        hydrated.push({
          key: pluginKey,
          scope: inst.scope,
          version: inst.version,
          installPath: inst.installPath,
          installedAt: inst.installedAt,
          lastUpdated: inst.lastUpdated,
          gitCommitSha: inst.gitCommitSha || null,
          manifest_path: manifestPath,
          manifest: manifest && {
            name: manifest.name,
            description: manifest.description,
            version: manifest.version,
            author: manifest.author,
          },
        });
      }
    }
  }

  return {
    ledger_path: ledgerPath,
    ledger_exists: ledger !== null,
    known_marketplaces_path: marketplacesPath,
    known_marketplaces: marketplacesIndex
      ? Object.entries(marketplacesIndex).map(([name, m]) => ({
          name,
          source: m.source,
          installLocation: m.installLocation,
          lastUpdated: m.lastUpdated,
        }))
      : null,
    installed: hydrated,
  };
};

const envelope = {
  schema_version: 1,
  hook: hookPayload,
  packmind: sidecar,
  env: {
    CLAUDE_PLUGIN_ROOT: pluginRoot || null,
    CLAUDE_PROJECT_DIR: projectDir,
  },
  git: gitInfo,
  plugins: {
    project_settings: projectSettings,
    user_settings: userSettings,
    ...enumerateInstalledPlugins(),
  },
};

const body = Buffer.from(JSON.stringify(envelope));
const url = new URL(RECEIVER_URL);

const req = request(
  {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    },
    timeout: 2000,
  },
  (res) => {
    res.resume();
    res.on('end', () => process.exit(0));
  },
);

req.on('error', () => process.exit(0));
req.on('timeout', () => {
  req.destroy();
  process.exit(0);
});

req.write(body);
req.end();
