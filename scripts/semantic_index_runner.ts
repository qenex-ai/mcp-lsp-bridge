import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ClientManager } from '../src/lsp/client-manager.js';
import { handleSemanticChunk } from '../src/tools/semantic-chunking.js';
import { logger } from '../src/utils/logger.js';
import { getSupportedExtensions } from '../src/config/lsp-servers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Concurrency limit for indexing
const CONCURRENCY_LIMIT = 4;
const MAX_FILE_SIZE_BYTES = 500 * 1024; // 500KB

async function main() {
    const defaultRoot = path.resolve(__dirname, '..');
    const workspaceRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultRoot;

    // Ensure we don't accidentally index root / if not intended, but user asked for it.
    // We should be careful about permissions.

    const clientManager = new ClientManager(workspaceRoot);
    const supportedExtensions = new Set(getSupportedExtensions());

    logger.info(`Starting scalable semantic indexing for root: ${workspaceRoot}`);

    // Output file (NDJSON)
    const outputPath = path.join(workspaceRoot, 'semantic_index.ndjson');
    // Clear existing file or create new
    // await fs.writeFile(outputPath, ''); // DISABLED RESUME MODE

    // RESUME LOGIC: Scan existing file for processed paths
    const processedFiles = new Set<string>();
    try {
        const fileHandle = await fs.open(outputPath, 'r');
        await fileHandle.close(); // Just check existence

        logger.info(`Checking existing index for resume: ${outputPath}`);
        const fileStream = fsSync.createReadStream(outputPath);
        const rl = (await import('readline')).createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                // Peek at filePath without full parse if possible, or just parse
                // NDJSON line: {"filePath":"...","chunks":...}
                // Regex might be faster for 800MB file than JSON.parse?
                // let's try regex for path. relative path.
                const match = line.match(/"filePath"\s*:\s*"([^"]+)"/);
                if (match) {
                    // We need absolute path to match what 'walk' produces?
                    // The record stores relative path.
                    // 'walk' produces absolute path.
                    // So we must resolve.
                    processedFiles.add(path.resolve(workspaceRoot, match[1]));
                }
            } catch (e) { }
        }
        logger.info(`Resuming index. Found ${processedFiles.size} already processed files.`);
    } catch (e) {
        // File doesn't exist, ignore
    }

    const outputStream = fsSync.createWriteStream(outputPath, { flags: 'a' });

    try {
        const files: string[] = [];
        const excludeDirs = new Set([
            'node_modules', '.git', 'dist', 'build', 'coverage', '.vscode', '.gemini',
            'proc', 'sys', 'dev', 'run', 'boot', 'mnt', 'media', 'tmp', 'var', 'etc', 'usr', 'opt', 'srv', 'bin', 'sbin', 'lib', 'lib64',
            '.mypy_cache', '.cache', '.npm', '.pip', '.cargo', '.rustup', '.terraform', '.pytest_cache', '__pycache__',
            '.julia', 'doc', 'docs', 'site-packages', 'gems'
        ]);

        // Walk function
        async function walk(dir: string) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!excludeDirs.has(entry.name)) await walk(fullPath);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (supportedExtensions.has(ext)) {
                            if (entry.name.endsWith('.ndjson') || entry.name.endsWith('.json') || entry.name.endsWith('.md')) {
                                // Careful with our own outputs
                                if (entry.name === 'semantic_index.ndjson' || entry.name === 'semantic_index.json' || entry.name === 'indexing_report.md') continue;
                            }
                            // RESUME CHECK
                            if (processedFiles.has(fullPath)) {
                                continue;
                            }
                            files.push(fullPath);
                        }
                    }
                }
            } catch (err) {
                logger.error(`Error walking ${dir}:`, err);
            }
        }

        await walk(workspaceRoot);
        logger.info(`Found ${files.length} files to index.`);

        let completed = 0;
        let errors = 0;

        // Process files with concurrency limit
        const processFile = async (file: string) => {
            try {
                // Check file size
                const stats = await fs.stat(file);
                if (stats.size > MAX_FILE_SIZE_BYTES) {
                    logger.warn(`Skipping large file ${path.relative(workspaceRoot, file)} (${stats.size} bytes)`);
                    return;
                }

                const resultJson = await Promise.race([
                    handleSemanticChunk({ filePath: file }, clientManager),
                    new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
                ]);

                const chunks = JSON.parse(resultJson);
                if (chunks.length > 0) {
                    const record = {
                        filePath: path.relative(workspaceRoot, file),
                        chunks: chunks
                    };
                    // Write line to NDJSON
                    const line = JSON.stringify(record) + '\n';
                    if (!outputStream.write(line)) {
                        // Handle backpressure if needed (simple await drain)
                        await new Promise(resolve => outputStream.once('drain', resolve));
                    }
                }
            } catch (err) {
                errors++;
                const msg = err instanceof Error ? err.message : String(err);
                if (!msg.includes('Unsupported file extension')) { // Ignore specific known noise
                    logger.error(`Failed to index ${path.relative(workspaceRoot, file)}: ${msg}`);
                }
            } finally {
                completed++;
                if (completed % 10 === 0) {
                    logger.info(`Progress: ${completed}/${files.length} (Errors: ${errors})`);
                }
            }
        };

        // Execution helper
        const runBatch = async () => {
            const queue = [...files];
            const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
                while (queue.length > 0) {
                    const file = queue.shift();
                    if (file) await processFile(file);
                }
            });
            await Promise.all(workers);
        };

        await runBatch();

        outputStream.end();
        logger.info(`Indexing complete. Saved to ${outputPath}`);
        logger.info(`Total files processed: ${completed}/${files.length} (Errors: ${errors})`);

    } catch (err) {
        logger.error('Indexing failed:', err);
    } finally {
        await clientManager.shutdown();
        process.exit(0);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
