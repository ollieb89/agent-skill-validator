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
exports.checkStructure = checkStructure;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SECRET_PATTERNS = [
    { name: 'API key pattern', re: /(?:api[_-]?key|api[_-]?secret|auth[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i },
    { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
    { name: 'Private key header', re: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE KEY-----/ },
    { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9_]{36}/ },
];
function scanForSecrets(content) {
    return SECRET_PATTERNS.filter(p => p.re.test(content)).map(p => p.name);
}
function checkStructure(skillPath, ignore = []) {
    const issues = [];
    const add = (level, check, message) => issues.push({ level, check, message });
    // Required files
    const hasReadme = fs.existsSync(path.join(skillPath, 'README.md')) || fs.existsSync(path.join(skillPath, 'README'));
    if (!hasReadme)
        add('error', 'readme-missing', 'README.md is missing — required for publish');
    const hasLicense = fs.existsSync(path.join(skillPath, 'LICENSE')) || fs.existsSync(path.join(skillPath, 'LICENSE.md')) || fs.existsSync(path.join(skillPath, 'LICENSE.txt'));
    if (!hasLicense)
        add('warning', 'license-missing', 'No LICENSE file found. MIT license recommended for public skills.');
    const hasSkillMd = fs.existsSync(path.join(skillPath, 'SKILL.md'));
    if (!hasSkillMd)
        add('warning', 'skill-md-missing', 'SKILL.md not found (required for OpenClaw ecosystem)');
    // examples/
    const examplesDir = path.join(skillPath, 'examples');
    if (!fs.existsSync(examplesDir) || !fs.statSync(examplesDir).isDirectory()) {
        add('info', 'examples-missing', 'No examples/ directory found. Adding examples improves discoverability.');
    }
    else {
        const exampleFiles = fs.readdirSync(examplesDir).filter(f => !f.startsWith('.'));
        if (exampleFiles.length === 0) {
            add('warning', 'examples-empty', 'examples/ directory is empty');
        }
    }
    // Secret scanning on tracked text files
    const scanDirs = [skillPath];
    const scannedFiles = [];
    for (const dir of scanDirs) {
        try {
            for (const file of fs.readdirSync(dir)) {
                if (file === 'node_modules' || file === '.git' || ignore.includes(file))
                    continue;
                const full = path.join(dir, file);
                if (!fs.statSync(full).isFile())
                    continue;
                if (/\.(ts|js|py|sh|yml|yaml|json|md|txt|env|cfg|conf|ini)$/i.test(file)) {
                    scannedFiles.push(full);
                }
            }
        }
        catch { /* skip inaccessible dirs */ }
    }
    for (const filePath of scannedFiles) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const found = scanForSecrets(content);
            for (const secret of found) {
                add('error', 'secret-detected', 'Potential secret found in ' + path.relative(skillPath, filePath) + ': ' + secret);
            }
        }
        catch { /* skip unreadable */ }
    }
    // .env file presence (risk warning)
    if (fs.existsSync(path.join(skillPath, '.env'))) {
        add('warning', 'env-file-present', '.env file detected. Ensure it is in .gitignore and never committed.');
    }
    const errors = issues.filter(i => i.level === 'error');
    const publishReady = errors.length === 0 && hasReadme && hasLicense && hasSkillMd;
    return { valid: errors.length === 0, issues, publishReady };
}
