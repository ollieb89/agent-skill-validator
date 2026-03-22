#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const detector_1 = require("../detector");
const linter_1 = require("../linter");
const schema_validator_1 = require("../schema-validator");
const structure_checker_1 = require("../structure-checker");
const registry_checker_1 = require("../registry-checker");
const reporter_1 = require("../reporter");
const config_1 = require("../config");
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = argv[i + 1];
            if (!next || next.startsWith('--')) {
                args[key] = true;
            }
            else {
                args[key] = next;
                i++;
            }
        }
        else if (!arg.startsWith('-')) {
            args._path = arg;
        }
    }
    return args;
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || args.h) {
        console.log(`agent-skill-validator - Validate agent skill repos\n\nUsage:\n  agent-skill-validator [path]\n\nOptions:\n  --ecosystem <openclaw|claude-code|codex|gemini|auto>  Ecosystem (default: auto)\n  --strict       Enable strict mode\n  --fail-on <errors|warnings|none>  Fail policy (default: errors)\n  --check-registry  Run registry compatibility check\n  --registry <clawhub|hcs26>  Target registry\n  --format <text|markdown>  Output format (default: text)\n  --help  Show help`);
        process.exit(0);
    }
    const skillPath = path.resolve(typeof args._path === 'string' ? args._path : '.');
    let config = { ...config_1.DEFAULT_CONFIG, skillPath };
    const cfgFile = path.join(skillPath, '.agent-skill-validator.yml');
    if (fs.existsSync(cfgFile)) {
        try {
            config = (0, config_1.parseConfig)(JSON.parse(fs.readFileSync(cfgFile, 'utf8')), skillPath);
        }
        catch { /* skip */ }
    }
    if (typeof args.ecosystem === 'string')
        config.ecosystem = args.ecosystem;
    if (args.strict === true)
        config.strict = true;
    if (typeof args['fail-on'] === 'string')
        config.failOn = args['fail-on'];
    if (args['check-registry'] === true)
        config.checkRegistry = true;
    if (typeof args.registry === 'string')
        config.registry = args.registry;
    let ecosystem = config.ecosystem;
    if (ecosystem === 'auto') {
        const detected = (0, detector_1.detectEcosystem)(skillPath);
        ecosystem = detected.ecosystem === 'auto' ? 'openclaw' : detected.ecosystem;
        console.log('Detected ecosystem: ' + ecosystem + ' (' + detected.confidence + ')');
    }
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    let lintResult = null;
    let schemaResult = null;
    if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf8');
        lintResult = (0, linter_1.lintSkillMd)(content, skillMdPath);
        const fm = (0, detector_1.parseSkillMdFrontmatter)(content);
        if (fm)
            schemaResult = (0, schema_validator_1.validateSkillMdFrontmatter)(fm);
    }
    const structureResult = (0, structure_checker_1.checkStructure)(skillPath, config.ignore);
    let registryResult = null;
    if (config.checkRegistry && config.registry !== 'none') {
        const content = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf8') : null;
        const fm = content ? (0, detector_1.parseSkillMdFrontmatter)(content) : null;
        if (fm)
            registryResult = (0, registry_checker_1.checkRegistryCompatibility)(fm, config.registry);
    }
    const report = (0, reporter_1.buildReport)(skillPath, ecosystem, lintResult, structureResult, schemaResult, registryResult);
    const format = typeof args.format === 'string' ? args.format : 'text';
    if (format === 'markdown')
        console.log((0, reporter_1.formatMarkdownReport)(report));
    else
        console.log((0, reporter_1.formatTextReport)(report));
    if ((0, config_1.shouldFail)(config, report.totalErrors, report.totalWarnings)) {
        console.error('\n✗ Validation failed: ' + report.totalErrors + ' error(s)');
        process.exit(1);
    }
}
main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });
