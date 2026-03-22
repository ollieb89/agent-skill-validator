export interface StructureIssue {
    level: 'error' | 'warning' | 'info';
    check: string;
    message: string;
}
export interface StructureCheckResult {
    valid: boolean;
    issues: StructureIssue[];
    publishReady: boolean;
}
export declare function checkStructure(skillPath: string, ignore?: string[]): StructureCheckResult;
