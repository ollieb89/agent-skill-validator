import { Registry } from './config';

export interface RegistryIssue {
  level: 'error' | 'warning';
  rule: string;
  message: string;
}

export interface RegistryCheckResult {
  valid: boolean;
  issues: RegistryIssue[];
  registry: Registry;
}

const ALLOWED_CATEGORIES = [
  'coding', 'research', 'writing', 'data', 'devops',
  'security', 'testing', 'documentation', 'communication', 'other'
];

const SKILL_ID_RE = /^[a-z0-9_-]+\/[a-z0-9_-]+$/;

export function checkRegistryCompatibility(
  data: Record<string, unknown>,
  registry: Registry
): RegistryCheckResult {
  const issues: RegistryIssue[] = [];
  const add = (level: RegistryIssue['level'], rule: string, message: string) =>
    issues.push({ level, rule, message });

  if (registry === 'none') {
    return { valid: true, issues: [], registry };
  }

  // skill-id
  const skillId = data['skill-id'] as string | undefined;
  if (!skillId) {
    add('error', 'skill-id-missing', 'Registry requires skill-id in format "org/skill-name"');
  } else if (!SKILL_ID_RE.test(skillId)) {
    add('error', 'skill-id-format', 'skill-id "' + skillId + '" must be format org/skill-name (lowercase, alphanumeric, hyphens/underscores only)');
  }

  // category
  const category = data.category as string | undefined;
  if (!category) {
    add('error', 'category-missing', 'Registry requires a category. Allowed: ' + ALLOWED_CATEGORIES.join(', '));
  } else if (!ALLOWED_CATEGORIES.includes(category)) {
    add('error', 'category-invalid', 'category "' + category + '" is not in the allowed list: ' + ALLOWED_CATEGORIES.join(', '));
  }

  // tags
  const tags = data.tags;
  if (!tags || !Array.isArray(tags)) {
    add('error', 'tags-missing', 'Registry requires at least 3 tags as a list');
  } else {
    if (tags.length < 3) {
      add('error', 'tags-min', 'Registry requires at least 3 tags (got ' + tags.length + ')');
    }
    if (tags.length > 10) {
      add('warning', 'tags-max', 'Registry recommends maximum 10 tags (got ' + tags.length + ')');
    }
  }

  // compatible-with
  const compatibleWith = data['compatible-with'];
  if (!compatibleWith || !Array.isArray(compatibleWith) || (compatibleWith as unknown[]).length === 0) {
    add('error', 'compatible-with-missing', 'Registry requires at least one compatible agent in compatible-with');
  }

  // HCS-26 specific
  if (registry === 'hcs26') {
    const license = data.license as string | undefined;
    if (!license) {
      add('warning', 'hcs26-license', 'HCS-26 registry recommends specifying a license (e.g., MIT)');
    }
  }

  return {
    valid: issues.filter(i => i.level === 'error').length === 0,
    issues,
    registry
  };
}
