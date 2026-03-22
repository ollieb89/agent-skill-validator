import { LintResult } from './linter';
import { StructureCheckResult } from './structure-checker';
import { RegistryCheckResult } from './registry-checker';
import { SchemaValidationResult } from './schema-validator';
import { Ecosystem } from './config';
export interface ValidationReport {
    skillPath: string;
    ecosystem: Ecosystem;
    lint: LintResult | null;
    structure: StructureCheckResult | null;
    schema: SchemaValidationResult | null;
    registry: RegistryCheckResult | null;
    totalErrors: number;
    totalWarnings: number;
    publishReady: boolean;
    overallValid: boolean;
}
export declare function buildReport(skillPath: string, ecosystem: Ecosystem, lint: LintResult | null, structure: StructureCheckResult | null, schema: SchemaValidationResult | null, registry: RegistryCheckResult | null): ValidationReport;
export declare function formatMarkdownReport(report: ValidationReport): string;
export declare function formatTextReport(report: ValidationReport): string;
