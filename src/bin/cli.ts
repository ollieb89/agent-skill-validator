#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { detectEcosystem, parseSkillMdFrontmatter } from '../detector';
import { lintSkillMd } from '../linter';
import { validateSkillMdFrontmatter } from '../schema-validator';
import { checkStructure } from '../structure-checker';
import { checkRegistryCompatibility } from '../registry-checker';
import { buildReport, formatMarkdownReport, formatTextReport } from '../reporter';
import { parseConfig, shouldFail, DEFAULT_CONFIG } from '../config';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) { args[key] = true; } else { args[key] = next; i++; }
    } else if (!arg.startsWith('-')) {
      args._path = arg;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(`agent-skill-validator - Validate agent skill repos\n\nUsage:\n  agent-skill-validator [path]\n\nOptions:\n  --ecosystem <openclaw|claude-code|codex|gemini|auto>  Ecosystem (default: auto)\n  --strict       Enable strict mode\n  --fail-on <errors|warnings|none>  Fail policy (default: errors)\n  --check-registry  Run registry compatibility check\n  --registry <clawhub|hcs26>  Target registry\n  --format <text|markdown>  Output format (default: text)\n  --help  Show help`);
    process.exit(0);
  }

  const skillPath = path.resolve(typeof args._path === 'string' ? args._path : '.');
  let config = { ...DEFAULT_CONFIG, skillPath };

  const cfgFile = path.join(skillPath, '.agent-skill-validator.yml');
  if (fs.existsSync(cfgFile)) {
    try { config = parseConfig(JSON.parse(fs.readFileSync(cfgFile, 'utf8')) as Record<string, unknown>, skillPath); } catch { /* skip */ }
  }

  if (typeof args.ecosystem === 'string') config.ecosystem = args.ecosystem as typeof config.ecosystem;
  if (args.strict === true) config.strict = true;
  if (typeof args['fail-on'] === 'string') config.failOn = args['fail-on'] as typeof config.failOn;
  if (args['check-registry'] === true) config.checkRegistry = true;
  if (typeof args.registry === 'string') config.registry = args.registry as typeof config.registry;

  let ecosystem = config.ecosystem;
  if (ecosystem === 'auto') {
    const detected = detectEcosystem(skillPath);
    ecosystem = detected.ecosystem === 'auto' ? 'openclaw' : detected.ecosystem;
    console.log('Detected ecosystem: ' + ecosystem + ' (' + detected.confidence + ')');
  }

  const skillMdPath = path.join(skillPath, 'SKILL.md');
  let lintResult = null;
  let schemaResult = null;
  if (fs.existsSync(skillMdPath)) {
    const content = fs.readFileSync(skillMdPath, 'utf8');
    lintResult = lintSkillMd(content, skillMdPath);
    const fm = parseSkillMdFrontmatter(content);
    if (fm) schemaResult = validateSkillMdFrontmatter(fm);
  }

  const structureResult = checkStructure(skillPath, config.ignore);
  let registryResult = null;
  if (config.checkRegistry && config.registry !== 'none') {
    const content = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf8') : null;
    const fm = content ? parseSkillMdFrontmatter(content) : null;
    if (fm) registryResult = checkRegistryCompatibility(fm, config.registry);
  }

  const report = buildReport(skillPath, ecosystem, lintResult, structureResult, schemaResult, registryResult);

  const format = typeof args.format === 'string' ? args.format : 'text';
  if (format === 'markdown') console.log(formatMarkdownReport(report));
  else console.log(formatTextReport(report));

  if (shouldFail(config, report.totalErrors, report.totalWarnings)) {
    console.error('\n✗ Validation failed: ' + report.totalErrors + ' error(s)');
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });
