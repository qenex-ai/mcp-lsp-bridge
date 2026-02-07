import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawn } from 'child_process';

// Configuration
const INDEX_FILE = 'semantic_index.ndjson';
const MAX_CONTEXT_CHARS = 30000; // conservative limit for context window
const TOP_K = 10; // Number of chunks to retrieve

interface ChunkMatch {
    filePath: string;
    chunk: any;
    score: number;
}

async function searchIndex(query: string, indexPath: string): Promise<ChunkMatch[]> {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (queryTerms.length === 0) return [];

    const matches: ChunkMatch[] = [];

    // Check if index exists
    if (!fs.existsSync(indexPath)) {
        console.error(`Index file not found: ${indexPath}`);
        process.exit(1);
    }

    const fileStream = fs.createReadStream(indexPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log('Searching index...');
    let processed = 0;

    for await (const line of rl) {
        processed++;
        if (processed % 10000 === 0) process.stdout.write('.');

        try {
            const record = JSON.parse(line);
            // Record format: { filePath: string, chunks: SemanticChunk[] }
            if (!record.chunks || !Array.isArray(record.chunks)) continue;

            for (const chunk of record.chunks) {
                let score = 0;
                const set = new Set(queryTerms); // unique terms
                const contentLower = (chunk.content || '').toLowerCase();
                const nameLower = (chunk.name || '').toLowerCase();

                for (const term of set) {
                    // Boost for name match
                    if (nameLower.includes(term)) score += 10;
                    // Boost for exact word match in content
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
    console.log('\nSearch complete.');

    // Sort by score descending
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

async function queryGemini(prompt: string) {
    return new Promise<void>((resolve, reject) => {
        // Try passing as argument first. If too long, maybe stdin? 
        // Let's assume argument for now as it's standard for simple CLIs. 
        // But context is huge. Stdin is better.
        // Usage: gemini [prompt]
        // If we omit prompt arg, does it read stdin? 
        // The help said: gemini [options] [prompt]

        // Let's try spawning with stdin.
        const child = spawn('gemini', [], {
            stdio: ['pipe', 'inherit', 'inherit']
        });

        child.stdin.write(prompt);
        child.stdin.end();

        child.on('error', (err) => {
            console.error('Failed to start gemini CLI:', err);
            reject(err);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                // If it failed, maybe try argument?
                // console.warn('Gemini CLI exited with code', code);
            }
            resolve();
        });
    });
}

async function main() {
    const query = process.argv.slice(2).join(' ');
    if (!query) {
        console.error('Usage: npm run query "<question>"');
        process.exit(1);
    }

    // Default to searching in root workspace
    // We assume script is run from project root or find index relative to CWD
    const rootDir = process.cwd();
    // Or try to find semantic_index.ndjson in CWD or /
    let indexPath = path.join(rootDir, INDEX_FILE);
    if (!fs.existsSync(indexPath)) {
        // Fallback to /semantic_index.ndjson if in container
        if (fs.existsSync('/semantic_index.ndjson')) {
            indexPath = '/semantic_index.ndjson';
        }
    }

    console.log(`Querying index at ${indexPath} for: "${query}"`);

    const matches = await searchIndex(query, indexPath);
    if (matches.length === 0) {
        console.log('No relevant code found in index.');
        return;
    }

    console.log(`Found ${matches.length} relevant code chunks.`);
    const prompt = constructPrompt(query, matches);

    console.log('Asking Gemini...\n');
    await queryGemini(prompt);
}

main().catch(console.error);
