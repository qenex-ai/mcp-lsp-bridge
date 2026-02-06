import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { formatChunkForLLM } from '../src/utils/chunk-formatter.js';
import { SemanticChunk } from '../src/tools/semantic-chunking.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FileIndex {
    filePath: string;
    chunks: SemanticChunk[];
}

async function main() {
    const indexPath = path.join(__dirname, '..', 'semantic_index.ndjson');
    console.log(`Loading index from ${indexPath}...`);

    try {
        const fileStream = fs.createReadStream(indexPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // Helper to search within a chunk tree
        const searchInChunks = (chunks: SemanticChunk[], name: string): SemanticChunk | undefined => {
            for (const c of chunks) {
                if (c.name === name) return c;
                if (c.children) {
                    const res = searchInChunks(c.children, name);
                    if (res) return res;
                }
            }
        };

        const targets = new Set(['valueSet', 'packages', 'handleSemanticChunk']);
        const foundItems: Record<string, { chunk: SemanticChunk, file: string }> = {};

        console.log('\n=== LLM Consumption Demo (NDJSON Stream) ===\n');

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                const fileIndex: FileIndex = JSON.parse(line);

                for (const target of targets) {
                    if (foundItems[target]) continue; // Already found

                    const res = searchInChunks(fileIndex.chunks, target);
                    if (res) {
                        foundItems[target] = { chunk: res, file: fileIndex.filePath };
                    }
                }

                // Early exit if all found
                if (Object.keys(foundItems).length === targets.size) {
                    break;
                }

            } catch (err) {
                // Ignore parse errors
            }
        }

        for (const name of targets) {
            if (foundItems[name]) {
                console.log(`\n--- Formatting chunk: ${name} ---`);
                const formatted = formatChunkForLLM(foundItems[name].chunk, foundItems[name].file);
                console.log(formatted);
            } else {
                console.log(`\n--- Chunk not found: ${name} ---`);
            }
        }

    } catch (err) {
        console.error('Failed to run demo:', err);
    }
}

main();
