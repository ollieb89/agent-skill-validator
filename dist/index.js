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
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const detector_1 = require("./detector");
const linter_1 = require("./linter");
const schema_validator_1 = require("./schema-validator");
const structure_checker_1 = require("./structure-checker");
const registry_checker_1 = require("./registry-checker");
const reporter_1 = require("./reporter");
const config_1 = require("./config");
async function run() {
    try {
        const skillPathInput = core.getInput('skill-path') || '.';
        const ecosystemInput = core.getInput('ecosystem') || 'auto';
        const strictInput = core.getBooleanInput('strict');
        const failOnInput = core.getInput('fail-on') || 'errors';
        const checkRegistryInput = core.getBooleanInput('check-registry');
        const registryInput = core.getInput('registry') || 'none';
        const skillPath = path.resolve(skillPathInput);
        let config = {
            ...config_1.DEFAULT_CONFIG,
            skillPath,
            ecosystem: ecosystemInput,
            strict: strictInput,
            failOn: failOnInput,
            checkRegistry: checkRegistryInput,
            registry: registryInput,
        };
        // Load config file if present
        const configFile = path.join(skillPath, '.agent-skill-validator.yml');
        if (fs.existsSync(configFile)) {
            try {
                const raw = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                config = (0, config_1.parseConfig)(raw, skillPath);
            }
            catch {
                core.warning('Failed to parse config file');
            }
        }
        // Auto-detect ecosystem
        let ecosystem = config.ecosystem;
        if (ecosystem === 'auto') {
            const detected = (0, detector_1.detectEcosystem)(skillPath);
            ecosystem = detected.ecosystem === 'auto' ? 'openclaw' : detected.ecosystem;
            core.info('Detected ecosystem: ' + ecosystem + ' (' + detected.confidence + ')');
        }
        // SKILL.md lint
        let lintResult = null;
        let schemaResult = null;
        const skillMdPath = path.join(skillPath, 'SKILL.md');
        if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf8');
            lintResult = (0, linter_1.lintSkillMd)(content, skillMdPath);
            const frontmatter = (0, detector_1.parseSkillMdFrontmatter)(content);
            if (frontmatter)
                schemaResult = (0, schema_validator_1.validateSkillMdFrontmatter)(frontmatter);
        }
        // Structure check
        const structureResult = (0, structure_checker_1.checkStructure)(skillPath, config.ignore);
        // Registry check
        let registryResult = null;
        if (config.checkRegistry && config.registry !== 'none') {
            const skillMdContent = fs.existsSync(skillMdPath) ? fs.readFileSync(skillMdPath, 'utf8') : null;
            const fm = skillMdContent ? (0, detector_1.parseSkillMdFrontmatter)(skillMdContent) : null;
            if (fm)
                registryResult = (0, registry_checker_1.checkRegistryCompatibility)(fm, config.registry);
        }
        const report = (0, reporter_1.buildReport)(skillPath, ecosystem, lintResult, structureResult, schemaResult, registryResult);
        core.setOutput('valid', String(report.overallValid));
        core.setOutput('errors', String(report.totalErrors));
        core.setOutput('warnings', String(report.totalWarnings));
        core.setOutput('publish-ready', String(report.publishReady));
        core.summary.addRaw((0, reporter_1.formatMarkdownReport)(report)).write();
        core.info('\n' + (0, reporter_1.formatTextReport)(report));
        if ((0, config_1.shouldFail)(config, report.totalErrors, report.totalWarnings)) {
            core.setFailed(report.totalErrors + ' error(s) found in skill validation');
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();
