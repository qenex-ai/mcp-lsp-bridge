import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

export const GeminiQueryArgsSchema = z.object({
    query: z.string().describe('The natural language question to ask about the codebase'),
});

interface ChunkMatch {
    filePath: string;
    chunk: any;
    score: number;
}

const INDEX_FILENAME = 'semantic_index.ndjson';
const MAX_CONTEXT_CHARS = 30000;
const TOP_K = 10;

// Helper to find index file
function findIndexFile(workspaceRoot?: string): string | null {
    // Try workspace root
    if (workspaceRoot) {
        const p = path.join(workspaceRoot, INDEX_FILENAME);
        if (fs.existsSync(p)) return p;
    }
    // Try current working directory
    const cwdP = path.join(process.cwd(), INDEX_FILENAME);
    if (fs.existsSync(cwdP)) return cwdP;

    // Try root (fallback for some container envs)
    if (fs.existsSync(`/${INDEX_FILENAME}`)) return `/${INDEX_FILENAME}`;

    return null;
}

async function searchIndex(query: string, indexPath: string): Promise<ChunkMatch[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const matches: ChunkMatch[] = [];

    const fileStream = fs.createReadStream(indexPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            if (!line.trim()) continue;
            const record = JSON.parse(line);
            // Record format: { filePath: string, chunks: SemanticChunk[] }
            if (!record.chunks || !Array.isArray(record.chunks)) continue;

            for (const chunk of record.chunks) {
                let score = 0;
                const set = new Set(queryTerms);
                const contentLower = (chunk.content || '').toLowerCase();
                const nameLower = (chunk.name || '').toLowerCase();

                for (const term of set) {
                    if (nameLower.includes(term)) score += 10;
                    if (contentLower.includes(term)) score += 1;
                }

                if (score > 0) {
                    matches.push({
                        filePath: record.filePath,
                        chunk: chunk,
                        score: score
                    });
                }
            }
        } catch (e) {
            // ignore parse errors
        }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, TOP_K);
}

function constructPrompt(query: string, matches: ChunkMatch[]): string {
    let context = "";
    for (const match of matches) {
        const snippet = `File: ${match.filePath}\nSymbol: ${match.chunk.name} (${match.chunk.kind})\nCode:\n${match.chunk.content}\n\n`;
        if (context.length + snippet.length > MAX_CONTEXT_CHARS) break;
        context += snippet;
    }

    return `You are an expert coding assistant. Answer the user's question based ONLY on the provided codebase context.

Context:
${context}

User Question: ${query}

Answer:`;
}

async function queryGemini(prompt: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const child = spawn('gemini', [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('error', (err) => {
            reject(err);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                logger.warn(`Gemini CLI exited with code ${code}: ${errorOutput}`);
                // If generic error, maybe try to return what we have or an error message
                if (!output && errorOutput) {
                    return reject(new Error(`Gemini CLI failed: ${errorOutput}`));
                }
            }
            resolve(output.trim());
        });

        // Write prompt to stdin
        child.stdin.write(prompt);
        child.stdin.end();
    });
}

export async function handleGeminiQuery(
    args: z.infer<typeof GeminiQueryArgsSchema>,
    workspaceRoot?: string
): Promise<string> {
    const { query } = args;

    const indexPath = findIndexFile(workspaceRoot);
    if (!indexPath) {
        return "Error: Semantic index not found. Please run indexing first.";
    }

    logger.info(`Gemini Query: "${query}" using index at ${indexPath}`);

    const matches = await searchIndex(query, indexPath);
    if (matches.length === 0) {
        return "No relevant code chunks found in the index for your query.";
    }

    const prompt = constructPrompt(query, matches);

    try {
        const answer = await queryGemini(prompt);
        return answer;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Gemini query failed:", error);
        return `Error querying Gemini: ${msg}`;
    }
}
