import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ClientManager } from '../src/lsp/client-manager.js';
import { handleSemanticChunk } from '../src/tools/semantic-chunking.js';
import { logger } from '../src/utils/logger.js';
import { DataNode } from 'ant-design-pro/lib/utils/types.js'; // This seems unused/incorrect, removing

// Import the configuration to get supported extensions
import { getSupportedExtensions, isExtensionSupported } from '../src/config/lsp-servers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const workspaceRoot = path.resolve(__dirname, '..');
    const clientManager = new ClientManager(workspaceRoot);

    // Get all supported extensions from the config
    const supportedExtensions = new Set(getSupportedExtensions());

    logger.info(`Starting semantic indexing for root: ${workspaceRoot}`);
    logger.info(`Supported extensions: ${Array.from(supportedExtensions).join(', ')}`);

    try {
        const files: string[] = [];

        // Exclude patterns
        const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode', '.gemini']);

        async function walk(dir: string) {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        if (!excludeDirs.has(entry.name)) {
                            await walk(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (supportedExtensions.has(ext)) {
                            // Skip definition files if they are not the primary target? 
                            // Keeping them for now as requested "all files"
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

        // Index each file
        const index = [];
        let completed = 0;
        let errors = 0;

        for (const file of files) {
            try {
                // logger.info(`Indexing (${completed + 1}/${files.length}): ${path.relative(workspaceRoot, file)}`);

                // Call the semantic chunking handler
                // We use a timeout to prevent hanging on a single file
                const resultJson = await Promise.race([
                    handleSemanticChunk({ filePath: file }, clientManager),
                    new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
                ]);

                const chunks = JSON.parse(resultJson as string);

                // Only add if we actually got chunks
                if (chunks.length > 0) {
                    index.push({
                        filePath: path.relative(workspaceRoot, file),
                        chunks: chunks
                    });
                } else {
                    // logger.warn(`No chunks found for ${path.relative(workspaceRoot, file)}`);
                }

            } catch (err) {
                errors++;
                const relPath = path.relative(workspaceRoot, file);
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('Unsupported file extension')) {
                    // Verify logic, shouldn't happen if we filtered correctly
                } else {
                    logger.error(`Failed to index ${relPath}: ${msg}`);
                }
            } finally {
                completed++;
                if (completed % 10 === 0) {
                    logger.info(`Progress: ${completed}/${files.length} (Errors: ${errors})`);
                }
            }
        }

        // Save output
        const outputPath = path.join(workspaceRoot, 'semantic_index.json');
        await fs.writeFile(outputPath, JSON.stringify(index, null, 2));

        logger.info(`Indexing complete. Saved to ${outputPath}`);
        logger.info(`Total files indexed: ${index.length}/${files.length} (Errors: ${errors})`);

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
