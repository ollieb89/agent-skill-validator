"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.parseConfig = parseConfig;
exports.shouldFail = shouldFail;
exports.DEFAULT_CONFIG = {
    ecosystem: 'auto',
    strict: false,
    failOn: 'errors',
    checkRegistry: false,
    registry: 'none',
    ignore: [],
    skillPath: '.'
};
function parseConfig(raw, skillPath) {
    const config = { ...exports.DEFAULT_CONFIG };
    if (skillPath)
        config.skillPath = skillPath;
    const ecosystems = ['openclaw', 'claude-code', 'codex', 'gemini', 'auto'];
    if (typeof raw.ecosystem === 'string' && ecosystems.includes(raw.ecosystem)) {
        config.ecosystem = raw.ecosystem;
    }
    if (typeof raw.strict === 'boolean')
        config.strict = raw.strict;
    const failOns = ['errors', 'warnings', 'none'];
    if (typeof raw['fail-on'] === 'string' && failOns.includes(raw['fail-on'])) {
        config.failOn = raw['fail-on'];
    }
    if (typeof raw['check-registry'] === 'boolean')
        config.checkRegistry = raw['check-registry'];
    const registries = ['clawhub', 'hcs26', 'none'];
    if (typeof raw.registry === 'string' && registries.includes(raw.registry)) {
        config.registry = raw.registry;
    }
    if (Array.isArray(raw.ignore)) {
        config.ignore = raw.ignore.filter((x) => typeof x === 'string');
    }
    return config;
}
function shouldFail(config, errors, warnings) {
    if (config.failOn === 'none')
        return false;
    if (config.failOn === 'errors')
        return errors > 0;
    if (config.failOn === 'warnings')
        return errors > 0 || warnings > 0;
    return false;
}
