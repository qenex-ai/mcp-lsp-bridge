import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SemanticChunk {
    name: string;
    kind: string;
    content: string;
    children?: SemanticChunk[];
}

interface FileIndex {
    filePath: string;
    chunks: SemanticChunk[];
}

interface Stats {
    totalFiles: number;
    totalChunks: number;
    totalChars: number;
    chunkSizes: number[];
    kindCounts: Record<string, number>;
    depths: number[];
}

async function main() {
    const indexPath = path.join(__dirname, '..', 'semantic_index.json');

    try {
        const data = await fs.readFile(indexPath, 'utf-8');
        const index: FileIndex[] = JSON.parse(data);

        const stats: Stats = {
            totalFiles: index.length,
            totalChunks: 0,
            totalChars: 0,
            chunkSizes: [],
            kindCounts: {},
            depths: []
        };

        const maxDepthItems: { name: string, depth: number, file: string }[] = [];
        const maxChildrenItems: { name: string, count: number, file: string }[] = [];

        function processChunk(chunk: SemanticChunk, depth: number, filePath: string) {
            stats.totalChunks++;
            stats.totalChars += chunk.content.length;
            stats.chunkSizes.push(chunk.content.length);
            stats.depths.push(depth);

            stats.kindCounts[chunk.kind] = (stats.kindCounts[chunk.kind] || 0) + 1;

            if (depth > 5) { // Track deep items
                maxDepthItems.push({ name: chunk.name, depth, file: filePath });
            }

            if (chunk.children && chunk.children.length > 0) {
                if (chunk.children.length > 5) { // Track complex items
                    maxChildrenItems.push({ name: chunk.name, count: chunk.children.length, file: filePath });
                }
                for (const child of chunk.children) {
                    processChunk(child, depth + 1, filePath);
                }
            }
        }

        for (const file of index) {
            for (const chunk of file.chunks) {
                processChunk(chunk, 1, file.filePath);
            }
        }

        // Sort and slice top lists
        maxDepthItems.sort((a, b) => b.depth - a.depth);
        maxChildrenItems.sort((a, b) => b.count - a.count);

        // Calculations
        const avgChunkSize = stats.totalChunks > 0 ? stats.totalChars / stats.totalChunks : 0;
        const maxChunkSize = Math.max(...stats.chunkSizes, 0);
        const minChunkSize = Math.min(...stats.chunkSizes, 0);
        const avgDepth = stats.totalChunks > 0 ? stats.depths.reduce((a, b) => a + b, 0) / stats.totalChunks : 0;
        const maxDepth = Math.max(...stats.depths, 0);

        // Report Generation
        const report = `
# Indexing Evaluation Report

## General Stats
- **Total Files**: ${stats.totalFiles}
- **Total Chunks**: ${stats.totalChunks}
- **Total Content Size**: ${(stats.totalChars / 1024).toFixed(2)} KB

## Chunk Size Stats
- **Average Size**: ${avgChunkSize.toFixed(2)} chars
- **Max Size**: ${maxChunkSize} chars
- **Min Size**: ${minChunkSize} chars

## Hierarchy Stats
- **Average Depth**: ${avgDepth.toFixed(2)}
- **Max Depth**: ${maxDepth}

### Deepest Semantic Structures
${maxDepthItems.slice(0, 5).map(i => `- [Depth ${i.depth}] **${i.name}** in \`${i.file}\``).join('\n')}

### Most Linked Chunks (Detailed)
${maxChildrenItems.slice(0, 5).map(i => `- [Children ${i.count}] **${i.name}** in \`${i.file}\``).join('\n')}

## Chunk Type Distribution
${Object.entries(stats.kindCounts)
                .sort((a, b) => b[1] - a[1]) // Sort by frequency desc
                .map(([kind, count]) => `- **${kind}**: ${count}`)
                .join('\n')}
`;

        console.log(report);

        // Also save to a file
        await fs.writeFile(path.join(__dirname, '..', 'indexing_report.md'), report);

    } catch (error) {
        console.error("Error evaluating index:", error);
    }
}

main();
