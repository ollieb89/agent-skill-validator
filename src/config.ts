export type Ecosystem = 'openclaw' | 'claude-code' | 'codex' | 'gemini' | 'auto';
export type FailOn = 'errors' | 'warnings' | 'none';
export type Registry = 'clawhub' | 'hcs26' | 'none';

export interface ValidatorConfig {
  ecosystem: Ecosystem;
  strict: boolean;
  failOn: FailOn;
  checkRegistry: boolean;
  registry: Registry;
  ignore: string[];
  skillPath: string;
}

export const DEFAULT_CONFIG: ValidatorConfig = {
  ecosystem: 'auto',
  strict: false,
  failOn: 'errors',
  checkRegistry: false,
  registry: 'none',
  ignore: [],
  skillPath: '.'
};

export function parseConfig(raw: Record<string, unknown>, skillPath?: string): ValidatorConfig {
  const config = { ...DEFAULT_CONFIG };
  if (skillPath) config.skillPath = skillPath;

  const ecosystems: Ecosystem[] = ['openclaw', 'claude-code', 'codex', 'gemini', 'auto'];
  if (typeof raw.ecosystem === 'string' && ecosystems.includes(raw.ecosystem as Ecosystem)) {
    config.ecosystem = raw.ecosystem as Ecosystem;
  }
  if (typeof raw.strict === 'boolean') config.strict = raw.strict;
  const failOns: FailOn[] = ['errors', 'warnings', 'none'];
  if (typeof raw['fail-on'] === 'string' && failOns.includes(raw['fail-on'] as FailOn)) {
    config.failOn = raw['fail-on'] as FailOn;
  }
  if (typeof raw['check-registry'] === 'boolean') config.checkRegistry = raw['check-registry'];
  const registries: Registry[] = ['clawhub', 'hcs26', 'none'];
  if (typeof raw.registry === 'string' && registries.includes(raw.registry as Registry)) {
    config.registry = raw.registry as Registry;
  }
  if (Array.isArray(raw.ignore)) {
    config.ignore = (raw.ignore as unknown[]).filter((x): x is string => typeof x === 'string');
  }
  return config;
}

export function shouldFail(config: ValidatorConfig, errors: number, warnings: number): boolean {
  if (config.failOn === 'none') return false;
  if (config.failOn === 'errors') return errors > 0;
  if (config.failOn === 'warnings') return errors > 0 || warnings > 0;
  return false;
}
