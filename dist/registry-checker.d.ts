import { Registry } from './config';
export interface RegistryIssue {
    level: 'error' | 'warning';
    rule: string;
    message: string;
}
export interface RegistryCheckResult {
    valid: boolean;
    issues: RegistryIssue[];
    registry: Registry;
}
export declare function checkRegistryCompatibility(data: Record<string, unknown>, registry: Registry): RegistryCheckResult;
