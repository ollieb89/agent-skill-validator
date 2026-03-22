export interface LintIssue {
    level: 'error' | 'warning' | 'info';
    rule: string;
    message: string;
    location?: string;
}
export interface LintResult {
    valid: boolean;
    errors: LintIssue[];
    warnings: LintIssue[];
    infos: LintIssue[];
    issues: LintIssue[];
}
export declare function lintSkillMd(content: string, filePath?: string): LintResult;
