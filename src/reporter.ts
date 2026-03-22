import { LintResult } from './linter';
import { StructureCheckResult } from './structure-checker';
import { RegistryCheckResult } from './registry-checker';
import { SchemaValidationResult } from './schema-validator';
import { Ecosystem } from './config';

export interface ValidationReport {
  skillPath: string;
  ecosystem: Ecosystem;
  lint: LintResult | null;
  structure: StructureCheckResult | null;
  schema: SchemaValidationResult | null;
  registry: RegistryCheckResult | null;
  totalErrors: number;
  totalWarnings: number;
  publishReady: boolean;
  overallValid: boolean;
}

export function buildReport(
  skillPath: string,
  ecosystem: Ecosystem,
  lint: LintResult | null,
  structure: StructureCheckResult | null,
  schema: SchemaValidationResult | null,
  registry: RegistryCheckResult | null
): ValidationReport {
  let totalErrors = 0;
  let totalWarnings = 0;

  if (lint) { totalErrors += lint.errors.length; totalWarnings += lint.warnings.length; }
  if (structure) {
    totalErrors += structure.issues.filter(i => i.level === 'error').length;
    totalWarnings += structure.issues.filter(i => i.level === 'warning').length;
  }
  if (schema) {
    totalErrors += schema.issues.filter(i => i.level === 'error').length;
    totalWarnings += schema.issues.filter(i => i.level === 'warning').length;
  }
  if (registry) {
    totalErrors += registry.issues.filter(i => i.level === 'error').length;
    totalWarnings += registry.issues.filter(i => i.level === 'warning').length;
  }

  return {
    skillPath,
    ecosystem,
    lint, structure, schema, registry,
    totalErrors,
    totalWarnings,
    publishReady: structure?.publishReady ?? false,
    overallValid: totalErrors === 0
  };
}

export function formatMarkdownReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push('## 🤖 agent-skill-validator Report');
  lines.push('');
  lines.push('**Skill Path:** `' + report.skillPath + '`  ');
  lines.push('**Ecosystem:** ' + report.ecosystem);
  lines.push('');

  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push('| Errors | ' + (report.totalErrors > 0 ? '❌ ' : '✅ ') + report.totalErrors + ' |');
  lines.push('| Warnings | ' + (report.totalWarnings > 0 ? '⚠️ ' : '✅ ') + report.totalWarnings + ' |');
  lines.push('| Publish Ready | ' + (report.publishReady ? '✅ Yes' : '❌ No') + ' |');
  lines.push('');

  if (report.lint) {
    lines.push('### 📝 SKILL.md Lint');
    lines.push('');
    if (report.lint.issues.length === 0) {
      lines.push('✅ No lint issues found.');
    } else {
      lines.push('| Level | Rule | Message |');
      lines.push('|-------|------|---------|');
      for (const issue of report.lint.issues) {
        const icon = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️';
        lines.push('| ' + icon + ' ' + issue.level + ' | `' + issue.rule + '` | ' + issue.message + ' |');
      }
    }
    lines.push('');
  }

  if (report.structure) {
    lines.push('### 📁 Structure Check');
    lines.push('');
    if (report.structure.issues.length === 0) {
      lines.push('✅ All structure checks passed.');
    } else {
      for (const issue of report.structure.issues) {
        const icon = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️';
        lines.push('- ' + icon + ' **' + issue.check + '**: ' + issue.message);
      }
    }
    lines.push('');
  }

  if (report.registry) {
    lines.push('### 🏪 Registry Compatibility');
    lines.push('');
    if (report.registry.issues.length === 0) {
      lines.push('✅ Registry-compatible (' + report.registry.registry + ').');
    } else {
      for (const issue of report.registry.issues) {
        const icon = issue.level === 'error' ? '❌' : '⚠️';
        lines.push('- ' + icon + ' ' + issue.message);
      }
    }
    lines.push('');
  }

  if (report.overallValid) {
    lines.push('### ✅ Validation Passed');
    lines.push('');
    if (report.publishReady) lines.push('This skill is ready to publish.');
    else lines.push('No errors. Some optional improvements suggested above.');
  } else {
    lines.push('### ❌ Validation Failed');
    lines.push('');
    lines.push(report.totalErrors + ' error(s) must be fixed before publishing.');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Powered by [agent-skill-validator](https://github.com/ollieb89/agent-skill-validator)*');

  return lines.join('\n');
}

export function formatTextReport(report: ValidationReport): string {
  return [
    'agent-skill-validator',
    '=====================',
    'Skill: ' + report.skillPath,
    'Ecosystem: ' + report.ecosystem,
    '',
    'Errors:   ' + report.totalErrors,
    'Warnings: ' + report.totalWarnings,
    'Publish ready: ' + (report.publishReady ? 'YES' : 'NO'),
    'Overall: ' + (report.overallValid ? 'PASS' : 'FAIL')
  ].join('\n');
}
