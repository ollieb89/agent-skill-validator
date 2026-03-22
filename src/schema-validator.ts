import * as fs from 'fs';
import * as path from 'path';

export interface SchemaIssue {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaIssue[];
}

type SimpleSchema = {
  required?: string[];
  properties?: Record<string, {
    type: string;
    minLength?: number;
    maxLength?: number;
    minItems?: number;
    maxItems?: number;
    pattern?: string;
    enum?: string[];
  }>;
};

function validateAgainstSimpleSchema(data: Record<string, unknown>, schema: SimpleSchema, prefix = ''): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  for (const req of schema.required ?? []) {
    if (data[req] === undefined || data[req] === null || data[req] === '') {
      issues.push({ level: 'error', field: prefix + req, message: 'Required field "' + req + '" is missing or empty' });
    }
  }

  for (const [key, rules] of Object.entries(schema.properties ?? {})) {
    const val = data[key];
    if (val === undefined) continue;

    if (rules.type === 'string' && typeof val !== 'string') {
      issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be a string' });
      continue;
    }
    if (rules.type === 'array' && !Array.isArray(val)) {
      issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be an array' });
      continue;
    }

    if (typeof val === 'string') {
      if (rules.minLength !== undefined && val.length < rules.minLength) {
        issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be at least ' + rules.minLength + ' chars (got ' + val.length + ')' });
      }
      if (rules.maxLength !== undefined && val.length > rules.maxLength) {
        issues.push({ level: 'warning', field: prefix + key, message: '"' + key + '" exceeds ' + rules.maxLength + ' chars' });
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(val)) {
        issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" value "' + val + '" does not match pattern ' + rules.pattern });
      }
      if (rules.enum && !rules.enum.includes(val)) {
        issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be one of: ' + rules.enum.join(', ') + ' (got "' + val + '")' });
      }
    }

    if (Array.isArray(val)) {
      if (rules.minItems !== undefined && val.length < rules.minItems) {
        issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" requires at least ' + rules.minItems + ' item(s) (got ' + val.length + ')' });
      }
      if (rules.maxItems !== undefined && val.length > rules.maxItems) {
        issues.push({ level: 'warning', field: prefix + key, message: '"' + key + '" has more than ' + rules.maxItems + ' items' });
      }
    }
  }

  return issues;
}

function loadSchema(schemaFile: string): SimpleSchema {
  const schemasDir = path.join(__dirname, '..', 'schemas');
  const schemaPath = path.join(schemasDir, schemaFile);
  if (!fs.existsSync(schemaPath)) return {};
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as SimpleSchema;
}

export function validateSkillMdFrontmatter(data: Record<string, unknown>): SchemaValidationResult {
  const schema = loadSchema('skill-md.schema.json');
  const issues = validateAgainstSimpleSchema(data, schema);
  return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}

export function validateHCS26Manifest(data: Record<string, unknown>): SchemaValidationResult {
  const schema = loadSchema('hcs26.schema.json');
  const issues = validateAgainstSimpleSchema(data, schema);
  return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}

export function validateOpenClawSkill(data: Record<string, unknown>): SchemaValidationResult {
  const schema = loadSchema('openclaw-skill.schema.json');
  const issues = validateAgainstSimpleSchema(data, schema);
  return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}

export function validateData(data: Record<string, unknown>, schemaType: 'skill-md' | 'hcs26' | 'openclaw'): SchemaValidationResult {
  if (schemaType === 'hcs26') return validateHCS26Manifest(data);
  if (schemaType === 'openclaw') return validateOpenClawSkill(data);
  return validateSkillMdFrontmatter(data);
}
