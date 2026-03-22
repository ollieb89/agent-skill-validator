import { lintSkillMd } from '../src/linter';

const GOOD_SKILL_MD = `---
name: My Example Skill
description: This skill does something genuinely useful for your agent workflow automation.
location: ~/.agents/skills/my-skill/SKILL.md
schema-version: 1.0
tags:
  - coding
  - automation
---

# My Example Skill

This skill helps with tasks.
`;

const MISSING_FIELDS = `---
name: x
---

body text
`;

describe('lintSkillMd', () => {
  it('passes a valid SKILL.md', () => {
    const result = lintSkillMd(GOOD_SKILL_MD);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors on missing frontmatter', () => {
    const result = lintSkillMd('# No frontmatter\n\nJust body text.');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.rule === 'frontmatter-missing')).toBe(true);
  });

  it('errors on missing name', () => {
    const content = `---\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'name-missing')).toBe(true);
  });

  it('errors on name too short', () => {
    const content = `---\nname: x\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'name-too-short')).toBe(true);
  });

  it('errors on description too short', () => {
    const content = `---\nname: My Skill\ndescription: short.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'description-too-short')).toBe(true);
  });

  it('errors on missing description', () => {
    const content = `---\nname: My Skill\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'description-missing')).toBe(true);
  });

  it('errors on missing location', () => {
    const content = `---\nname: My Skill\ndescription: This is a long enough description for the validator check.\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'location-missing')).toBe(true);
  });

  it('warns on missing schema-version', () => {
    const content = `---\nname: My Skill\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.warnings.some(w => w.rule === 'schema-version-missing')).toBe(true);
  });

  it('warns on invalid schema-version format', () => {
    const content = `---\nname: My Skill\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\nschema-version: latest\n---\n`;
    const result = lintSkillMd(content);
    expect(result.warnings.some(w => w.rule === 'schema-version-format')).toBe(true);
  });

  it('errors on placeholder in name', () => {
    const content = `---\nname: TODO skill name\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'name-placeholder')).toBe(true);
  });

  it('errors on placeholder in description', () => {
    const content = `---\nname: My Skill\ndescription: FIXME - add description here for this thing.\nlocation: ./SKILL.md\n---\n`;
    const result = lintSkillMd(content);
    expect(result.errors.some(e => e.rule === 'description-placeholder')).toBe(true);
  });

  it('warns on tags > 10', () => {
    const tags = Array.from({ length: 11 }, (_, i) => '  - tag' + i).join('\n');
    const content = `---\nname: My Skill\ndescription: This is a long enough description for the validator check.\nlocation: ./SKILL.md\ntags:\n${tags}\n---\n`;
    const result = lintSkillMd(content);
    expect(result.warnings.some(w => w.rule === 'tags-too-many')).toBe(true);
  });

  it('detects local links and adds info', () => {
    const content = `---\nname: My Skill\ndescription: This is a long enough description for the validator.\nlocation: ./SKILL.md\n---\n[link](./local-file.md)\n`;
    const result = lintSkillMd(content);
    expect(result.infos.some(i => i.rule === 'local-link')).toBe(true);
  });

  it('returns location in issue', () => {
    const result = lintSkillMd('# no frontmatter', '/path/SKILL.md');
    expect(result.issues[0].location).toBe('/path/SKILL.md');
  });
});
