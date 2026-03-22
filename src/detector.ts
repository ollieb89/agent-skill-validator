import * as fs from 'fs';
import * as path from 'path';
import { Ecosystem } from './config';

export interface DetectedEcosystem {
  ecosystem: Ecosystem;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
  skillFiles: string[];
}

export function detectEcosystem(skillPath: string): DetectedEcosystem {
  const signals: string[] = [];
  const skillFiles: string[] = [];
  const scores: Record<string, number> = { openclaw: 0, 'claude-code': 0, codex: 0, gemini: 0 };

  // Check for SKILL.md — strong OpenClaw signal
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (fs.existsSync(skillMdPath)) {
    skillFiles.push(skillMdPath);
    const content = fs.readFileSync(skillMdPath, 'utf8');
    if (content.includes('openclaw') || content.includes('OpenClaw')) {
      scores.openclaw += 3;
      signals.push('SKILL.md contains openclaw reference');
    } else {
      scores.openclaw += 2;
      signals.push('SKILL.md present (OpenClaw format)');
    }
  }

  // Claude Code: .claude/ directory or commands/ directory
  if (fs.existsSync(path.join(skillPath, '.claude'))) {
    scores['claude-code'] += 3;
    signals.push('.claude/ directory found (Claude Code)');
  }
  if (fs.existsSync(path.join(skillPath, 'commands'))) {
    scores['claude-code'] += 2;
    signals.push('commands/ directory found (Claude Code)');
  }

  // Codex: codex.yml or .codex/
  if (fs.existsSync(path.join(skillPath, 'codex.yml')) || fs.existsSync(path.join(skillPath, '.codex'))) {
    scores.codex += 3;
    signals.push('codex.yml or .codex found (Codex)');
  }

  // Gemini CLI: gemini.yml or GEMINI.md
  if (fs.existsSync(path.join(skillPath, 'gemini.yml')) || fs.existsSync(path.join(skillPath, 'GEMINI.md'))) {
    scores.gemini += 3;
    signals.push('gemini.yml or GEMINI.md found (Gemini CLI)');
  }

  // agent-skill.yml or agent-skill.json — generic signal
  const genericManifests = ['agent-skill.yml', 'agent-skill.yaml', 'agent-skill.json', 'skill.yml', 'skill.yaml'];
  for (const m of genericManifests) {
    const p = path.join(skillPath, m);
    if (fs.existsSync(p)) {
      skillFiles.push(p);
      signals.push('Generic skill manifest: ' + m);
      break;
    }
  }

  // package.json scan for agent keywords
  const pkgPath = path.join(skillPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
      const keywords = (pkg.keywords as string[] | undefined) ?? [];
      if (keywords.some(k => k.includes('claude') || k.includes('claude-code'))) {
        scores['claude-code'] += 1;
        signals.push('package.json keywords include Claude');
      }
      if (keywords.some(k => k.includes('openclaw'))) {
        scores.openclaw += 1;
        signals.push('package.json keywords include openclaw');
      }
    } catch { /* skip */ }
  }

  // Determine winner
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topEco, topScore] = sorted[0];
  const [, secondScore] = sorted[1] ?? ['', 0];

  let confidence: DetectedEcosystem['confidence'];
  if (topScore === 0) confidence = 'low';
  else if (topScore - secondScore >= 2) confidence = 'high';
  else confidence = 'medium';

  return {
    ecosystem: topScore === 0 ? 'auto' : topEco as Ecosystem,
    confidence,
    signals,
    skillFiles
  };
}

export function parseSkillMdFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split(/\r?\n/);

  let currentKey: string | null = null;
  let inArray = false;
  const arrayValues: string[] = [];

  for (const line of lines) {
    const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      if (inArray && currentKey) {
        frontmatter[currentKey] = [...arrayValues];
        arrayValues.length = 0;
        inArray = false;
      }
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === '' || val === '|' || val === '>') {
        inArray = true;
      } else {
        frontmatter[currentKey] = val.replace(/^["']|["']$/g, '');
        inArray = false;
      }
    } else if (inArray && line.trim().startsWith('-') && currentKey) {
      arrayValues.push(line.replace(/^\s*-\s*/, '').trim());
    }
  }

  if (inArray && currentKey && arrayValues.length > 0) {
    frontmatter[currentKey] = [...arrayValues];
  }

  return frontmatter;
}

export function extractBodyLinks(content: string): string[] {
  const links: string[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(content)) !== null) {
    links.push(m[2]);
  }
  return links;
}
