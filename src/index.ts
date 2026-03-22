import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { detectEcosystem, parseSkillMdFrontmatter } from './detector';
import { lintSkillMd } from './linter';
import { validateSkillMdFrontmatter, validateHCS26Manifest } from './schema-validator';
import { checkStructure } from './structure-checker';
import { checkRegistryCompatibility } from './registry-checker';
import { buildReport, formatMarkdownReport, formatTextReport } from './reporter';
import { parseConfig, shouldFail, ValidatorConfig, DEFAULT_CONFIG } from './config';

async function run(): Promise<void> {
  try {
    const skillPathInput = core.getInput('skill-path') || '.';
    const ecosystemInput = core.getInput('ecosystem') || 'auto';
    const strictInput = core.getBooleanInput('strict');
    const failOnInput = core.getInput('fail-on') || 'errors';
    const checkRegistryInput = core.getBooleanInput('check-registry');
    const registryInput = core.getInput('registry') || 'none';

    const skillPath = path.resolve(skillPathInput);

    let config: ValidatorConfig = {
      ...DEFAULT_CONFIG,
      skillPath,
      ecosystem: ecosystemInput as ValidatorConfig['ecosystem'],
      strict: strictInput,
      failOn: failOnInput as ValidatorConfig['failOn'],
      checkRegistry: checkRegistryInput,
      registry: registryInput as ValidatorConfig['registry'],
    };

    // Load config file if present
    const configFile = path.join(skillPath, '.agent-skill-validator.yml');
    if (fs.existsSync(configFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Record<string, unknown>;
        config = parseConfig(raw, skillPath);
      } catch { core.warning('Failed to parse config file'); }
    }

    // Auto-detect ecosystem
    let ecosystem = config.ecosystem;
    if (ecosystem === 'auto') {
      const detected = detectEcosystem(skillPath);
      ecosystem = detected.ecosystem === 'auto' ? 'openclaw' : detected.ecosystem;
      core.info('Detected ecosystem: ' + ecosystem + ' (' + detected.confidence + ')');
    }

    // SKILL.md lint
    let lintResult = null;
    let schemaResult = null;
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf8');
      lintResult = lintSkillMd(content, skillMdPath);
      const frontmatter = parseSkillMdFrontmatter(content);
      if (frontmatter) schemaResult = validateSkillMdFrontmatter(frontmatter);
    }

    // Structure check
    const structureResult = checkStructure(skillPath, config.ignore);

    // Registry check
    let registryResult = null;
    if (config.checkRegistry && config.registry !== 'none') {
      const skillMdContent = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf8') : null;
      const fm = skillMdContent ? parseSkillMdFrontmatter(skillMdContent) : null;
      if (fm) registryResult = checkRegistryCompatibility(fm, config.registry);
    }

    const report = buildReport(skillPath, ecosystem, lintResult, structureResult, schemaResult, registryResult);

    core.setOutput('valid', String(report.overallValid));
    core.setOutput('errors', String(report.totalErrors));
    core.setOutput('warnings', String(report.totalWarnings));
    core.setOutput('publish-ready', String(report.publishReady));

    core.summary.addRaw(formatMarkdownReport(report)).write();
    core.info('\n' + formatTextReport(report));

    if (shouldFail(config, report.totalErrors, report.totalWarnings)) {
      core.setFailed(report.totalErrors + ' error(s) found in skill validation');
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
