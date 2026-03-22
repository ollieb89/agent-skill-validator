import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkStructure } from '../src/structure-checker';
import { checkRegistryCompatibility } from '../src/registry-checker';
import { validateSkillMdFrontmatter, validateHCS26Manifest, validateData } from '../src/schema-validator';

function tmpDir(files: Record<string, string | null>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asv-struct-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (content === null) fs.mkdirSync(full, { recursive: true });
    else fs.writeFileSync(full, content);
  }
  return dir;
}

const FULL_SKILL = {
  'README.md': '# Skill Readme',
  'LICENSE': 'MIT License\nCopyright',
  'SKILL.md': '---\nname: My Skill\n---\n',
  'examples/basic.md': '# Basic example'
};

describe('checkStructure', () => {
  it('passes for a complete skill directory', () => {
    const dir = tmpDir(FULL_SKILL);
    const result = checkStructure(dir);
    expect(result.valid).toBe(true);
    expect(result.issues.filter(i => i.level === 'error')).toHaveLength(0);
  });

  it('errors on missing README', () => {
    const dir = tmpDir({ 'LICENSE': 'MIT', 'SKILL.md': '---\n---\n' });
    const result = checkStructure(dir);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.check === 'readme-missing')).toBe(true);
  });

  it('warns on missing LICENSE', () => {
    const dir = tmpDir({ 'README.md': '# README', 'SKILL.md': '---\n---\n' });
    const result = checkStructure(dir);
    expect(result.issues.some(i => i.check === 'license-missing')).toBe(true);
  });

  it('warns on missing SKILL.md', () => {
    const dir = tmpDir({ 'README.md': '# README', 'LICENSE': 'MIT' });
    const result = checkStructure(dir);
    expect(result.issues.some(i => i.check === 'skill-md-missing')).toBe(true);
  });

  it('emits info on missing examples/', () => {
    const dir = tmpDir({ 'README.md': '# README', 'LICENSE': 'MIT', 'SKILL.md': '' });
    const result = checkStructure(dir);
    expect(result.issues.some(i => i.check === 'examples-missing')).toBe(true);
  });

  it('detects secrets in files', () => {
    const dir = tmpDir({
      'README.md': '# README',
      'config.yml': 'api_key: "sk-abcdefghijklmnop1234567890abcdefghij"'
    });
    const result = checkStructure(dir);
    expect(result.issues.some(i => i.check === 'secret-detected')).toBe(true);
  });

  it('warns on .env file presence', () => {
    const dir = tmpDir({ 'README.md': '# README', '.env': 'SECRET=abc' });
    const result = checkStructure(dir);
    expect(result.issues.some(i => i.check === 'env-file-present')).toBe(true);
  });

  it('publishReady only when all required files present and no errors', () => {
    const dir = tmpDir(FULL_SKILL);
    const result = checkStructure(dir);
    expect(result.publishReady).toBe(true);
  });

  it('publishReady false when missing README', () => {
    const dir = tmpDir({ 'LICENSE': 'MIT', 'SKILL.md': '' });
    expect(checkStructure(dir).publishReady).toBe(false);
  });
});

describe('checkRegistryCompatibility', () => {
  const VALID_DATA = {
    'skill-id': 'myorg/my-skill',
    name: 'My Skill',
    description: 'This is a long enough description that passes validation.',
    category: 'coding',
    tags: ['code', 'automation', 'testing'],
    'compatible-with': ['openclaw', 'claude-code'],
  };

  it('passes valid data for clawhub', () => {
    const result = checkRegistryCompatibility(VALID_DATA, 'clawhub');
    expect(result.valid).toBe(true);
  });

  it('passes with no checks when registry is none', () => {
    const result = checkRegistryCompatibility({}, 'none');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('errors on missing skill-id', () => {
    const data = { ...VALID_DATA, 'skill-id': undefined };
    const result = checkRegistryCompatibility(data as Record<string, unknown>, 'clawhub');
    expect(result.issues.some(i => i.rule === 'skill-id-missing')).toBe(true);
  });

  it('errors on invalid skill-id format', () => {
    const data = { ...VALID_DATA, 'skill-id': 'INVALID SKILL ID' };
    const result = checkRegistryCompatibility(data, 'clawhub');
    expect(result.issues.some(i => i.rule === 'skill-id-format')).toBe(true);
  });

  it('errors on invalid category', () => {
    const data = { ...VALID_DATA, category: 'hacking' };
    const result = checkRegistryCompatibility(data, 'hcs26');
    expect(result.issues.some(i => i.rule === 'category-invalid')).toBe(true);
  });

  it('errors on fewer than 3 tags', () => {
    const data = { ...VALID_DATA, tags: ['one', 'two'] };
    const result = checkRegistryCompatibility(data, 'clawhub');
    expect(result.issues.some(i => i.rule === 'tags-min')).toBe(true);
  });

  it('warns when more than 10 tags', () => {
    const data = { ...VALID_DATA, tags: Array.from({ length: 11 }, (_, i) => 'tag' + i) };
    const result = checkRegistryCompatibility(data, 'clawhub');
    expect(result.issues.some(i => i.rule === 'tags-max')).toBe(true);
  });

  it('errors on missing compatible-with', () => {
    const data = { ...VALID_DATA, 'compatible-with': [] };
    const result = checkRegistryCompatibility(data, 'clawhub');
    expect(result.issues.some(i => i.rule === 'compatible-with-missing')).toBe(true);
  });

  it('warns on missing license for hcs26', () => {
    const result = checkRegistryCompatibility(VALID_DATA, 'hcs26');
    expect(result.issues.some(i => i.rule === 'hcs26-license')).toBe(true);
  });
});

describe('schema-validator', () => {
  it('passes valid skill-md frontmatter', () => {
    const data = { name: 'My Skill', description: 'A good long description with enough characters.', location: './SKILL.md' };
    expect(validateSkillMdFrontmatter(data).valid).toBe(true);
  });

  it('errors on missing required field in skill-md', () => {
    const data = { name: 'My Skill' };
    expect(validateSkillMdFrontmatter(data).valid).toBe(false);
  });

  it('passes valid HCS-26 manifest', () => {
    const data = {
      'skill-id': 'org/skill',
      name: 'My Skill',
      description: 'A good long description with enough characters here.',
      category: 'coding',
      tags: ['a', 'b', 'c'],
      'compatible-with': ['openclaw'],
    };
    expect(validateHCS26Manifest(data).valid).toBe(true);
  });

  it('errors on HCS-26 missing skill-id', () => {
    const data = { name: 'My Skill', description: 'A long description here.', category: 'coding', tags: ['a', 'b', 'c'], 'compatible-with': ['openclaw'] };
    expect(validateHCS26Manifest(data).valid).toBe(false);
  });

  it('validateData dispatches to correct schema', () => {
    const data = { name: 'My Skill', description: 'A good long description.', location: './SKILL.md' };
    expect(validateData(data, 'skill-md').valid).toBe(true);
  });
});
