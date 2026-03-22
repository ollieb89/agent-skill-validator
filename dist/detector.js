"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectEcosystem = detectEcosystem;
exports.parseSkillMdFrontmatter = parseSkillMdFrontmatter;
exports.extractBodyLinks = extractBodyLinks;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function detectEcosystem(skillPath) {
    const signals = [];
    const skillFiles = [];
    const scores = { openclaw: 0, 'claude-code': 0, codex: 0, gemini: 0 };
    // Check for SKILL.md — strong OpenClaw signal
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
        skillFiles.push(skillMdPath);
        const content = fs.readFileSync(skillMdPath, 'utf8');
        if (content.includes('openclaw') || content.includes('OpenClaw')) {
            scores.openclaw += 3;
            signals.push('SKILL.md contains openclaw reference');
        }
        else {
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
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const keywords = pkg.keywords ?? [];
            if (keywords.some(k => k.includes('claude') || k.includes('claude-code'))) {
                scores['claude-code'] += 1;
                signals.push('package.json keywords include Claude');
            }
            if (keywords.some(k => k.includes('openclaw'))) {
                scores.openclaw += 1;
                signals.push('package.json keywords include openclaw');
            }
        }
        catch { /* skip */ }
    }
    // Determine winner
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topEco, topScore] = sorted[0];
    const [, secondScore] = sorted[1] ?? ['', 0];
    let confidence;
    if (topScore === 0)
        confidence = 'low';
    else if (topScore - secondScore >= 2)
        confidence = 'high';
    else
        confidence = 'medium';
    return {
        ecosystem: topScore === 0 ? 'auto' : topEco,
        confidence,
        signals,
        skillFiles
    };
}
function parseSkillMdFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match)
        return null;
    const frontmatter = {};
    const lines = match[1].split(/\r?\n/);
    let currentKey = null;
    let inArray = false;
    const arrayValues = [];
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
            }
            else {
                frontmatter[currentKey] = val.replace(/^["']|["']$/g, '');
                inArray = false;
            }
        }
        else if (inArray && line.trim().startsWith('-') && currentKey) {
            arrayValues.push(line.replace(/^\s*-\s*/, '').trim());
        }
    }
    if (inArray && currentKey && arrayValues.length > 0) {
        frontmatter[currentKey] = [...arrayValues];
    }
    return frontmatter;
}
function extractBodyLinks(content) {
    const links = [];
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(content)) !== null) {
        links.push(m[2]);
    }
    return links;
}
