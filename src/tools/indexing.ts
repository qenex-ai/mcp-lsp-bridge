import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';

// --- Types ---

// Schema for project_index
export const ProjectIndexArgsSchema = z.object({
    rootPath: z.string().optional().describe('Root directory to start indexing from (default: workspace root)'),
    maxDepth: z.number().optional().default(10).describe('Maximum recursion depth'),
    exclude: z.array(z.string()).optional().default([
        'node_modules', '.git', '.vscode', 'dist', 'build', 'coverage', '__pycache__'
    ]).describe('Directory names to exclude'),
});

// Schema for read_and_chunk
export const ReadAndChunkArgsSchema = z.object({
    filePath: z.string().describe('Absolute file path to read'),
    chunkSize: z.number().optional().default(2000).describe('Character count per chunk'),
    overlap: z.number().optional().default(200).describe('Character overlap between chunks'),
});

export interface IndexEntry {
    path: string;
    name: string;
    type: 'file' | 'directory';
    size?: number;
}

// --- Handlers ---

/**
 * Handle project_index tool call
 */
export async function handleProjectIndex(
    args: z.infer<typeof ProjectIndexArgsSchema>,
    workspaceRoot?: string
): Promise<string> {
    const root = args.rootPath || workspaceRoot;

    if (!root) {
        throw new Error("No root path provided and no workspace root configured");
    }

    logger.info(`Indexing project at ${root}`);

    const results: IndexEntry[] = [];

    await walkDir(root, root, args.maxDepth, new Set(args.exclude), results);

    return JSON.stringify(results, null, 2);
}

/**
 * Recursive directory walker
 */
async function walkDir(
    currentPath: string,
    rootPath: string,
    depth: number,
    exclude: Set<string>,
    results: IndexEntry[]
) {
    if (depth < 0) return;

    try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const relPath = path.relative(rootPath, fullPath);

            if (exclude.has(entry.name)) continue;

            if (entry.isDirectory()) {
                results.push({
                    path: relPath,
                    name: entry.name,
                    type: 'directory'
                });
                await walkDir(fullPath, rootPath, depth - 1, exclude, results);
            } else if (entry.isFile()) {
                const stats = await fs.stat(fullPath);
                results.push({
                    path: relPath,
                    name: entry.name,
                    type: 'file',
                    size: stats.size
                });
            }
        }
    } catch (error) {
        logger.error(`Error walking directory ${currentPath}:`, error);
    }
}


/**
 * Handle read_and_chunk tool call
 */
export async function handleReadAndChunk(
    args: z.infer<typeof ReadAndChunkArgsSchema>
): Promise<string> {
    const { filePath, chunkSize, overlap } = args;

    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const chunks: string[] = [];

        let start = 0;
        while (start < content.length) {
            const end = Math.min(start + chunkSize, content.length);
            chunks.push(content.slice(start, end));

            if (end === content.length) break;

            start += (chunkSize - overlap);
        }

        return JSON.stringify({
            filePath,
            totalSize: content.length,
            chunkCount: chunks.length,
            chunks
        }, null, 2);

    } catch (error) {
        throw new Error(`Failed to read/chunk file ${filePath}: ${error}`);
    }
}
