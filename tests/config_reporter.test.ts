import { parseConfig, shouldFail, DEFAULT_CONFIG } from '../src/config';
import { buildReport, formatMarkdownReport, formatTextReport } from '../src/reporter';
import { LintResult } from '../src/linter';

describe('parseConfig', () => {
  it('returns defaults for empty input', () => {
    const cfg = parseConfig({});
    expect(cfg.ecosystem).toBe('auto');
    expect(cfg.failOn).toBe('errors');
    expect(cfg.strict).toBe(false);
  });

  it('parses ecosystem', () => {
    expect(parseConfig({ ecosystem: 'claude-code' }).ecosystem).toBe('claude-code');
  });

  it('parses fail-on', () => {
    expect(parseConfig({ 'fail-on': 'warnings' }).failOn).toBe('warnings');
  });

  it('parses registry', () => {
    expect(parseConfig({ registry: 'hcs26' }).registry).toBe('hcs26');
  });

  it('parses ignore list', () => {
    expect(parseConfig({ ignore: ['drafts/'] }).ignore).toContain('drafts/');
  });

  it('ignores invalid ecosystem', () => {
    expect(parseConfig({ ecosystem: 'skynet' }).ecosystem).toBe('auto');
  });
});

describe('shouldFail', () => {
  it('fails on errors when fail-on=errors and there are errors', () => {
    const cfg = { ...DEFAULT_CONFIG, failOn: 'errors' as const };
    expect(shouldFail(cfg, 1, 0)).toBe(true);
  });

  it('does not fail when no errors and fail-on=errors', () => {
    const cfg = { ...DEFAULT_CONFIG, failOn: 'errors' as const };
    expect(shouldFail(cfg, 0, 5)).toBe(false);
  });

  it('fails on warnings when fail-on=warnings', () => {
    const cfg = { ...DEFAULT_CONFIG, failOn: 'warnings' as const };
    expect(shouldFail(cfg, 0, 1)).toBe(true);
  });

  it('never fails when fail-on=none', () => {
    const cfg = { ...DEFAULT_CONFIG, failOn: 'none' as const };
    expect(shouldFail(cfg, 5, 5)).toBe(false);
  });
});

describe('buildReport + formatters', () => {
  const goodLint: LintResult = {
    valid: true, errors: [], warnings: [], infos: [], issues: []
  };
  const badLint: LintResult = {
    valid: false,
    errors: [{ level: 'error', rule: 'name-missing', message: 'name is required' }],
    warnings: [], infos: [],
    issues: [{ level: 'error', rule: 'name-missing', message: 'name is required' }]
  };

  it('builds report with correct totals', () => {
    const report = buildReport('/path', 'openclaw', goodLint, null, null, null);
    expect(report.totalErrors).toBe(0);
    expect(report.overallValid).toBe(true);
  });

  it('counts errors from lint', () => {
    const report = buildReport('/path', 'openclaw', badLint, null, null, null);
    expect(report.totalErrors).toBe(1);
    expect(report.overallValid).toBe(false);
  });

  it('formatMarkdownReport includes skill path', () => {
    const report = buildReport('/my/skill', 'openclaw', goodLint, null, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('/my/skill');
    expect(md).toContain('openclaw');
  });

  it('formatMarkdownReport shows validation passed', () => {
    const report = buildReport('/ok', 'openclaw', goodLint, null, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Validation Passed');
  });

  it('formatMarkdownReport shows validation failed', () => {
    const report = buildReport('/bad', 'openclaw', badLint, null, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Validation Failed');
  });

  it('formatTextReport includes key fields', () => {
    const report = buildReport('/skill', 'gemini', goodLint, null, null, null);
    const text = formatTextReport(report);
    expect(text).toContain('/skill');
    expect(text).toContain('gemini');
    expect(text).toContain('PASS');
  });

  it('formatMarkdownReport includes powered-by footer', () => {
    const report = buildReport('/s', 'auto', goodLint, null, null, null);
    expect(formatMarkdownReport(report)).toContain('agent-skill-validator');
  });
});

describe('formatMarkdownReport with structure and registry', () => {
  const goodLint = { valid: true, errors: [], warnings: [], infos: [], issues: [] };
  const structurePass = { valid: true, issues: [], publishReady: true };
  const structureFail = { valid: false, issues: [{ level: 'error' as const, check: 'readme-missing', message: 'README is missing' }], publishReady: false };
  const registryPass = { valid: true, issues: [], registry: 'clawhub' as const };

  it('shows structure section when present', () => {
    const report = buildReport('/s', 'openclaw', goodLint, structurePass, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Structure Check');
    expect(md).toContain('All structure checks passed');
  });

  it('shows structure failures', () => {
    const report = buildReport('/s', 'openclaw', goodLint, structureFail, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('readme-missing');
  });

  it('shows registry section when present', () => {
    const report = buildReport('/s', 'openclaw', goodLint, null, null, registryPass);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Registry Compatibility');
  });

  it('publish ready shown in summary', () => {
    const report = buildReport('/s', 'openclaw', goodLint, structurePass, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Publish Ready');
  });

  it('counts errors from structure result', () => {
    const report = buildReport('/s', 'openclaw', goodLint, structureFail, null, null);
    expect(report.totalErrors).toBe(1);
    expect(report.publishReady).toBe(false);
  });

  it('shows lint section when lint result present', () => {
    const lintWithIssue = {
      valid: false,
      errors: [{ level: 'error' as const, rule: 'name-missing', message: 'Name missing', location: 'SKILL.md' }],
      warnings: [],
      infos: [],
      issues: [{ level: 'error' as const, rule: 'name-missing', message: 'Name missing', location: 'SKILL.md' }]
    };
    const report = buildReport('/s', 'openclaw', lintWithIssue, null, null, null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('SKILL.md Lint');
    expect(md).toContain('name-missing');
  });
});
