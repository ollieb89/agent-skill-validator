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
exports.validateSkillMdFrontmatter = validateSkillMdFrontmatter;
exports.validateHCS26Manifest = validateHCS26Manifest;
exports.validateOpenClawSkill = validateOpenClawSkill;
exports.validateData = validateData;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function validateAgainstSimpleSchema(data, schema, prefix = '') {
    const issues = [];
    for (const req of schema.required ?? []) {
        if (data[req] === undefined || data[req] === null || data[req] === '') {
            issues.push({ level: 'error', field: prefix + req, message: 'Required field "' + req + '" is missing or empty' });
        }
    }
    for (const [key, rules] of Object.entries(schema.properties ?? {})) {
        const val = data[key];
        if (val === undefined)
            continue;
        if (rules.type === 'string' && typeof val !== 'string') {
            issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be a string' });
            continue;
        }
        if (rules.type === 'array' && !Array.isArray(val)) {
            issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be an array' });
            continue;
        }
        if (typeof val === 'string') {
            if (rules.minLength !== undefined && val.length < rules.minLength) {
                issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be at least ' + rules.minLength + ' chars (got ' + val.length + ')' });
            }
            if (rules.maxLength !== undefined && val.length > rules.maxLength) {
                issues.push({ level: 'warning', field: prefix + key, message: '"' + key + '" exceeds ' + rules.maxLength + ' chars' });
            }
            if (rules.pattern && !new RegExp(rules.pattern).test(val)) {
                issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" value "' + val + '" does not match pattern ' + rules.pattern });
            }
            if (rules.enum && !rules.enum.includes(val)) {
                issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" must be one of: ' + rules.enum.join(', ') + ' (got "' + val + '")' });
            }
        }
        if (Array.isArray(val)) {
            if (rules.minItems !== undefined && val.length < rules.minItems) {
                issues.push({ level: 'error', field: prefix + key, message: '"' + key + '" requires at least ' + rules.minItems + ' item(s) (got ' + val.length + ')' });
            }
            if (rules.maxItems !== undefined && val.length > rules.maxItems) {
                issues.push({ level: 'warning', field: prefix + key, message: '"' + key + '" has more than ' + rules.maxItems + ' items' });
            }
        }
    }
    return issues;
}
function loadSchema(schemaFile) {
    const schemasDir = path.join(__dirname, '..', 'schemas');
    const schemaPath = path.join(schemasDir, schemaFile);
    if (!fs.existsSync(schemaPath))
        return {};
    return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}
function validateSkillMdFrontmatter(data) {
    const schema = loadSchema('skill-md.schema.json');
    const issues = validateAgainstSimpleSchema(data, schema);
    return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}
function validateHCS26Manifest(data) {
    const schema = loadSchema('hcs26.schema.json');
    const issues = validateAgainstSimpleSchema(data, schema);
    return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}
function validateOpenClawSkill(data) {
    const schema = loadSchema('openclaw-skill.schema.json');
    const issues = validateAgainstSimpleSchema(data, schema);
    return { valid: issues.filter(i => i.level === 'error').length === 0, issues };
}
function validateData(data, schemaType) {
    if (schemaType === 'hcs26')
        return validateHCS26Manifest(data);
    if (schemaType === 'openclaw')
        return validateOpenClawSkill(data);
    return validateSkillMdFrontmatter(data);
}
