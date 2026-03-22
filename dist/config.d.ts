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
export declare const DEFAULT_CONFIG: ValidatorConfig;
export declare function parseConfig(raw: Record<string, unknown>, skillPath?: string): ValidatorConfig;
export declare function shouldFail(config: ValidatorConfig, errors: number, warnings: number): boolean;
