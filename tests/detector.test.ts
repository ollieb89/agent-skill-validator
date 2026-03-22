import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectEcosystem, parseSkillMdFrontmatter, extractBodyLinks } from '../src/detector';

function tmpDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asv-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

describe('detectEcosystem', () => {
  it('detects openclaw from SKILL.md', () => {
    const dir = tmpDir({ 'SKILL.md': '---\nname: test\n---\nOpenClaw skill' });
    const result = detectEcosystem(dir);
    expect(result.ecosystem).toBe('openclaw');
  });

  it('detects claude-code from .claude directory', () => {
    const dir = tmpDir({ '.claude/commands.md': '# commands' });
    const result = detectEcosystem(dir);
    expect(result.ecosystem).toBe('claude-code');
    expect(result.signals.some(s => s.includes('.claude'))).toBe(true);
  });

  it('detects gemini from GEMINI.md', () => {
    const dir = tmpDir({ 'GEMINI.md': '# Gemini skill' });
    const result = detectEcosystem(dir);
    expect(result.ecosystem).toBe('gemini');
  });

  it('returns auto when no signals detected', () => {
    const dir = tmpDir({ 'README.md': '# blank project' });
    const result = detectEcosystem(dir);
    expect(result.ecosystem).toBe('auto');
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence when one ecosystem is clearly dominant', () => {
    const dir = tmpDir({
      'SKILL.md': '---\nname: test\n---\nopenclaw',
      '.claude/x': '',
    });
    const result = detectEcosystem(dir);
    expect(result.confidence).not.toBe('low');
  });
});

describe('parseSkillMdFrontmatter', () => {
  it('parses simple key-value pairs', () => {
    const content = `---\nname: My Skill\ndescription: A good description.\nlocation: ./SKILL.md\n---\n`;
    const fm = parseSkillMdFrontmatter(content);
    expect(fm).not.toBeNull();
    expect(fm?.name).toBe('My Skill');
    expect(fm?.location).toBe('./SKILL.md');
  });

  it('parses array values', () => {
    const content = `---\ntags:\n  - foo\n  - bar\n---\n`;
    const fm = parseSkillMdFrontmatter(content);
    expect(Array.isArray(fm?.tags)).toBe(true);
    expect(fm?.tags).toContain('foo');
    expect(fm?.tags).toContain('bar');
  });

  it('returns null when no frontmatter present', () => {
    expect(parseSkillMdFrontmatter('# No frontmatter')).toBeNull();
  });

  it('strips quotes from string values', () => {
    const content = `---\nname: "Quoted Name"\n---\n`;
    const fm = parseSkillMdFrontmatter(content);
    expect(fm?.name).toBe('Quoted Name');
  });
});

describe('extractBodyLinks', () => {
  it('extracts markdown links', () => {
    const content = 'See [docs](./docs.md) and [site](https://example.com)';
    expect(extractBodyLinks(content)).toContain('./docs.md');
    expect(extractBodyLinks(content)).toContain('https://example.com');
  });

  it('returns empty for no links', () => {
    expect(extractBodyLinks('no links here')).toHaveLength(0);
  });
});
