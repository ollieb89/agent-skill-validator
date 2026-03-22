import { Ecosystem } from './config';
export interface DetectedEcosystem {
    ecosystem: Ecosystem;
    confidence: 'high' | 'medium' | 'low';
    signals: string[];
    skillFiles: string[];
}
export declare function detectEcosystem(skillPath: string): DetectedEcosystem;
export declare function parseSkillMdFrontmatter(content: string): Record<string, unknown> | null;
export declare function extractBodyLinks(content: string): string[];
