import { parseSkillMdFrontmatter, extractBodyLinks } from './detector';

export interface LintIssue {
  level: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  location?: string;
}

export interface LintResult {
  valid: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  infos: LintIssue[];
  issues: LintIssue[];
}

const PLACEHOLDER_PATTERNS = [
  /\btodo\b/i, /\bfixme\b/i, /\byour description here\b/i,
  /\bexample\s+description\b/i, /\binsert\s+description\b/i,
  /\bchange\s+this\b/i, /\btbd\b/i
];

const SEMVER_RE = /^\d+\.\d+(\.\d+)?$/;

const NAME_VALID_RE = /^[a-zA-Z0-9][a-zA-Z0-9 _\-.:()]+$/;

export function lintSkillMd(content: string, filePath: string = 'SKILL.md'): LintResult {
  const issues: LintIssue[] = [];
  const addIssue = (level: LintIssue['level'], rule: string, message: string) => {
    issues.push({ level, rule, message, location: filePath });
  };

  // Parse frontmatter
  const frontmatter = parseSkillMdFrontmatter(content);
  if (!frontmatter) {
    addIssue('error', 'frontmatter-missing', 'SKILL.md is missing YAML frontmatter (--- block). Add required fields: name, description, location.');
    return buildResult(issues);
  }

  // name
  const name = frontmatter.name as string | undefined;
  if (!name || String(name).trim() === '') {
    addIssue('error', 'name-missing', 'Missing required field: name');
  } else {
    if (!NAME_VALID_RE.test(String(name))) {
      addIssue('warning', 'name-chars', 'name "' + name + '" contains unusual characters');
    }
    if (String(name).length < 2) {
      addIssue('error', 'name-too-short', 'name must be at least 2 characters');
    }
    if (String(name).length > 80) {
      addIssue('warning', 'name-too-long', 'name is over 80 characters — consider trimming');
    }
    if (PLACEHOLDER_PATTERNS.some(p => p.test(String(name)))) {
      addIssue('error', 'name-placeholder', 'name appears to contain placeholder text: "' + name + '"');
    }
  }

  // description
  const description = frontmatter.description as string | undefined;
  if (!description || String(description).trim() === '') {
    addIssue('error', 'description-missing', 'Missing required field: description');
  } else {
    if (String(description).length < 20) {
      addIssue('error', 'description-too-short', 'description must be at least 20 characters (got ' + String(description).length + ')');
    }
    if (String(description).length > 500) {
      addIssue('warning', 'description-too-long', 'description is over 500 characters');
    }
    if (PLACEHOLDER_PATTERNS.some(p => p.test(String(description)))) {
      addIssue('error', 'description-placeholder', 'description appears to contain placeholder text');
    }
  }

  // location
  const location = frontmatter.location as string | undefined;
  if (!location || String(location).trim() === '') {
    addIssue('error', 'location-missing', 'Missing required field: location (path to SKILL.md file)');
  }

  // schema-version
  const schemaVersion = frontmatter['schema-version'] as string | undefined;
  if (!schemaVersion) {
    addIssue('warning', 'schema-version-missing', 'schema-version not specified. Add "schema-version: 1.0" to frontmatter.');
  } else if (!SEMVER_RE.test(String(schemaVersion))) {
    addIssue('warning', 'schema-version-format', 'schema-version "' + schemaVersion + '" is not in semver format (expected N.N or N.N.N)');
  }

  // tags
  const tags = frontmatter.tags as unknown;
  if (tags !== undefined) {
    if (!Array.isArray(tags)) {
      addIssue('warning', 'tags-format', 'tags should be a YAML array');
    } else {
      if (tags.length < 1) {
        addIssue('info', 'tags-count', 'Consider adding at least one tag to improve discoverability');
      }
      if (tags.length > 10) {
        addIssue('warning', 'tags-too-many', 'tags should not exceed 10 entries (got ' + tags.length + ')');
      }
    }
  }

  // Scan body for placeholders
  const body = content.replace(/^---[\s\S]*?---\r?\n/, '');
  if (PLACEHOLDER_PATTERNS.some(p => p.test(body))) {
    addIssue('warning', 'body-placeholder', 'SKILL.md body appears to contain placeholder text (TODO/FIXME/TBD)');
  }

  // Check for broken-looking local links
  const links = extractBodyLinks(content);
  for (const link of links) {
    if (link.startsWith('#') || link.startsWith('http') || link.startsWith('mailto:')) continue;
    addIssue('info', 'local-link', 'Local link detected: "' + link + '" — verify it resolves correctly in the skill directory');
  }

  return buildResult(issues);
}

function buildResult(issues: LintIssue[]): LintResult {
  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  const infos = issues.filter(i => i.level === 'info');
  return { valid: errors.length === 0, errors, warnings, infos, issues };
}
