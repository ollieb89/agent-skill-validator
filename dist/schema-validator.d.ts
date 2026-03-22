export interface SchemaIssue {
    level: 'error' | 'warning';
    field: string;
    message: string;
}
export interface SchemaValidationResult {
    valid: boolean;
    issues: SchemaIssue[];
}
export declare function validateSkillMdFrontmatter(data: Record<string, unknown>): SchemaValidationResult;
export declare function validateHCS26Manifest(data: Record<string, unknown>): SchemaValidationResult;
export declare function validateOpenClawSkill(data: Record<string, unknown>): SchemaValidationResult;
export declare function validateData(data: Record<string, unknown>, schemaType: 'skill-md' | 'hcs26' | 'openclaw'): SchemaValidationResult;
