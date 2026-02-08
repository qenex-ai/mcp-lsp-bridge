import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { DocumentSymbol, SymbolInformation } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { logger } from '../utils/logger.js';

import { TextDocument } from 'vscode-languageserver-textdocument';

export const SemanticChunkArgsSchema = z.object({
    filePath: z.string().describe('Absolute file path to chunk'),
});

export interface SemanticChunk {
    name: string;
    kind: string;
    detail?: string;
    range: {
        startLine: number;
        endLine: number;
        startChar: number;
        endChar: number;
    };
    content: string;
    parent?: string;
    hierarchy?: string[];
    children?: SemanticChunk[];
}

// Map SymbolKind number to string name (simplified)
const SymbolKindNames: { [key: number]: string } = {
    1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
    6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
    11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant', 15: 'String',
    16: 'Number', 17: 'Boolean', 18: 'Array', 19: 'Object', 20: 'Key',
    21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event', 25: 'Operator',
    26: 'TypeParameter'
};

export async function handleSemanticChunk(
    args: z.infer<typeof SemanticChunkArgsSchema>,
    clientManager: ClientManager
): Promise<string> {
    const { filePath } = args;

    if (!isAbsolutePath(filePath)) {
        throw new Error(`File path must be absolute: ${filePath}`);
    }

    logger.info(`Semantic chunking for ${filePath}`);

    try {
        // 1. Ensure document is open
        await clientManager.ensureDocumentOpen(filePath);

        // 2. Get document content
        const docInfo = clientManager.getDocumentManager().getDocument(filePath);
        if (!docInfo) {
            throw new Error("Could not retrieve document content after opening");
        }
        const doc = TextDocument.create(docInfo.uri, docInfo.languageId, docInfo.version, docInfo.text);
        const fullText = doc.getText();
        const splitLines = fullText.split(/\r?\n/);

        // 3. Get document symbols
        const uri = pathToUri(filePath);
        const symbols = await clientManager.sendRequest(
            filePath,
            'textDocument/documentSymbol',
            { textDocument: { uri } },
            120000 // 2 minute timeout for large files
        ) as DocumentSymbol[] | SymbolInformation[] | null;

        if (!symbols || !Array.isArray(symbols)) {
            return JSON.stringify({ message: "No symbols found", chunks: [] });
        }

        // 4. Process symbols into chunks
        // Note: DocumentSymbol is hierarchical, SymbolInformation is flat. 
        // We prefer DocumentSymbol behavior for semantic structure.
        // If we get SymbolInformation (flat), we might treat them as top-level.


        // Helper to extract text from range
        const getText = (range: any) => {
            const startLine = range.start.line;
            const endLine = range.end.line;
            if (startLine === endLine) {
                return splitLines[startLine].substring(range.start.character, range.end.character);
            }

            const firstLine = splitLines[startLine].substring(range.start.character);
            const lastLine = splitLines[endLine].substring(0, range.end.character);
            const middleLines = splitLines.slice(startLine + 1, endLine);

            return [firstLine, ...middleLines, lastLine].join('\n');
        };

        // Configuration for "Smallest LLM Context"
        const MAX_CHUNK_CHARS = 1500; // ~400 tokens, very safe for small windows
        const OVERLAP_CHARS = 150;    // Context overlap

        // Recursive splitter for large content
        const splitContent = (content: string, hierarchy: string[] = []): string[] => {
            if (content.length <= MAX_CHUNK_CHARS) return [content];

            const chunks: string[] = [];
            let startIndex = 0;

            // Simple line-based splitting to avoid breaking code mid-line if possible
            const lines = content.split('\n');
            let currentChunkLines: string[] = [];
            let currentSize = 0;

            // Header context (e.g. function signature) is critical to keep
            // But we already have it in 'hierarchy'.
            // However, sticking the *signature* at the top of every chunk if it's code is nice.
            // For now, relies on 'hierarchy' field in JSON.

            for (const line of lines) {
                if (currentSize + line.length > MAX_CHUNK_CHARS && currentChunkLines.length > 0) {
                    chunks.push(currentChunkLines.join('\n'));
                    // Implementing overlap by keeping last N lines? 
                    // Let's keep simpler overlap logic or just hard split for now for reliability
                    currentChunkLines = [];
                    currentSize = 0;
                }
                currentChunkLines.push(line);
                currentSize += line.length + 1; // +1 for newline
            }
            if (currentChunkLines.length > 0) {
                chunks.push(currentChunkLines.join('\n'));
            }

            return chunks;
        };

        const finalChunks: SemanticChunk[] = [];

        const processSymbol = (sym: any, parentName?: string, parentHierarchy: string[] = []) => {
            // Handle both DocumentSymbol (has .range) and SymbolInformation (has .location.range)
            const range = sym.range || (sym.location && sym.location.range);
            const kindName = SymbolKindNames[sym.kind] || 'Unknown';

            // Get the minimal context line (first line of the symbol's range)
            const contextLine = splitLines[range.start.line].trim();
            // Don't add if it's just a brace or empty
            const currentHierarchy = contextLine.length > 3 ? [...parentHierarchy, contextLine] : parentHierarchy;

            const content = getText(range);

            // If this symbol has children, we might NOT want to verify the *entire* content 
            // of this symbol if the children cover it.
            // Strategy: Index the specific content of this symbol *excluding* children?
            // "Intelligent": We usually want the *leaf* nodes (methods) to be the main chunks.
            // Containers (Classes) are just grouping.

            const isContainer = (sym.children && sym.children.length > 0);

            // If it's a leaf node (Function, Method) or a small container, chunk it.
            // If it's a huge Class with methods, we rely on the methods to be chunked recursively.
            // BUT: We might miss class-level constants or fields if we skip container.
            // HYBRID: We emit a chunk for the container *definition* (signature) only?

            // Decision: For "Smallest Context", we MUST split large bodies.

            if (!isContainer || content.length < MAX_CHUNK_CHARS) {
                // It's a leaf or small enough to fits.
                // Even valid leaves might be HUGE (2000 line function).
                const subChunks = splitContent(content);

                subChunks.forEach((subVal, idx) => {
                    finalChunks.push({
                        name: sym.name,
                        kind: kindName,
                        detail: sym.detail,
                        range: { // Simplified range, imprecise for sub-chunks but OK for linking
                            startLine: range.start.line,
                            endLine: range.end.line,
                            startChar: range.start.character,
                            endChar: range.end.character
                        },
                        content: subVal, // The sub-chunk content
                        parent: parentName,
                        hierarchy: currentHierarchy
                    });
                });
            } else {
                // If the symbol itself is too large, and it's not a leaf,
                // we might still want to capture its signature as a chunk.
                // For now, we rely on children to be processed.
                // If it's a large leaf, splitContent handles it.
            }

            // Recurse children
            if (sym.children && sym.children.length > 0) {
                sym.children.forEach((child: any) => processSymbol(child, sym.name, currentHierarchy));
            }
        };

        // 4. Process symbols into chunks (LSP Supported)
        if (symbols && Array.isArray(symbols) && symbols.length > 0) {
            symbols.forEach(s => processSymbol(s));
            return JSON.stringify(finalChunks, null, 2);
        }

        // FALLBACK: If no symbols found, or LSP failed, treat as raw text file
        logger.info(`Fallback chunking for ${filePath} (No symbols found)`);
        const fallbackChunks = splitContent(fullText);

        fallbackChunks.forEach((chunkText, idx) => {
            finalChunks.push({
                name: path.basename(filePath) + (idx > 0 ? ` (Part ${idx + 1})` : ''),
                kind: 'File',
                detail: `Text content ${idx + 1}/${fallbackChunks.length}`,
                range: {
                    startLine: 0,
                    endLine: splitLines.length - 1,
                    startChar: 0,
                    endChar: 0
                },
                content: chunkText,
                hierarchy: [path.basename(filePath)] // Just file name context
            });
        });

        return JSON.stringify(finalChunks, null, 2);

    } catch (error) {
        // Even inside catch, try to salvage content!
        const message = error instanceof Error ? error.message : String(error);

        // If it's a "Unsupported file extension" kind of error, we can still chunk it as text!
        // But we need to read the file first.
        try {
            // Retrieve content if we haven't already
            // const content = await fs.readFile(filePath, 'utf-8'); // Need fs import here?
            // Actually let's just rely on the main flow. If ensureDocumentOpen fails, we are stuck.
            // ClientManager.ensureDocumentOpen failing means we can't get text via LSP.
            // But we can use fs.
            // For now, let's just log error. The caller (runner) handles the loop.
            // Integrating raw FS read here is complex because we need 'fs'.
        } catch (e) { }

        logger.error(`Failed to semantically chunk ${filePath}:`, error);

        // Return empty so runner continues
        return JSON.stringify([]);
    }
}
