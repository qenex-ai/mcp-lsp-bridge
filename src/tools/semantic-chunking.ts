import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { DocumentSymbol, SymbolInformation } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { logger } from '../utils/logger.js';

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as path from 'path';

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
        let fullText = '';
        let splitLines: string[] = [];
        let symbols = null;
        let usedLsp = false;

        // 1. Try to get content and symbols via LSP
        try {
            await clientManager.ensureDocumentOpen(filePath);
            const docInfo = clientManager.getDocumentManager().getDocument(filePath);
            if (docInfo) {
                const doc = TextDocument.create(docInfo.uri, docInfo.languageId, docInfo.version, docInfo.text);
                fullText = doc.getText();
                splitLines = fullText.split(/\r?\n/);

                const uri = pathToUri(filePath);
                symbols = await clientManager.sendRequest(
                    filePath,
                    'textDocument/documentSymbol',
                    { textDocument: { uri } },
                    120000
                ) as DocumentSymbol[] | SymbolInformation[] | null;
                usedLsp = true;
            }
        } catch (e) {
            // LSP failed or unsupported. Fallback to FS.
            try {
                const fs = await import('fs/promises');
                fullText = await fs.readFile(filePath, 'utf-8');
                splitLines = fullText.split(/\r?\n/);
            } catch (readErr) {
                throw new Error(`Failed to read file ${filePath}: ${readErr}`);
            }
        }

        const finalChunks: SemanticChunk[] = [];

        // Configuration for "Smallest LLM Context"
        const MAX_CHUNK_CHARS = 1500;

        const splitContent = (content: string): string[] => {
            if (content.length <= MAX_CHUNK_CHARS) return [content];
            const chunks: string[] = [];
            const lines = content.split('\n');
            let currentChunkLines: string[] = [];
            let currentSize = 0;
            for (const line of lines) {
                if (currentSize + line.length > MAX_CHUNK_CHARS && currentChunkLines.length > 0) {
                    chunks.push(currentChunkLines.join('\n'));
                    currentChunkLines = [];
                    currentSize = 0;
                }
                currentChunkLines.push(line);
                currentSize += line.length + 1;
            }
            if (currentChunkLines.length > 0) chunks.push(currentChunkLines.join('\n'));
            return chunks;
        };

        // 2. If we have symbols, use them
        if (usedLsp && symbols && Array.isArray(symbols) && symbols.length > 0) {

            const getText = (range: any) => {
                const startLine = range.start.line;
                const endLine = range.end.line;
                if (startLine >= splitLines.length) return ""; // Safety
                if (startLine === endLine) {
                    return splitLines[startLine].substring(range.start.character, range.end.character);
                }
                const firstLine = splitLines[startLine].substring(range.start.character);
                const lastLine = splitLines[endLine].substring(0, range.end.character);
                const middleLines = splitLines.slice(startLine + 1, endLine);
                return [firstLine, ...middleLines, lastLine].join('\n');
            };

            const processSymbol = (sym: any, parentName?: string, parentHierarchy: string[] = []) => {
                const range = sym.range || (sym.location && sym.location.range);
                const kindName = SymbolKindNames[sym.kind] || 'Unknown';
                const contextLine = splitLines[range.start.line] ? splitLines[range.start.line].trim() : "";
                const currentHierarchy = contextLine.length > 3 ? [...parentHierarchy, contextLine] : parentHierarchy;
                const content = getText(range);
                const isContainer = (sym.children && sym.children.length > 0);

                if (!isContainer || content.length < MAX_CHUNK_CHARS) {
                    const subChunks = splitContent(content);
                    subChunks.forEach((subVal) => {
                        finalChunks.push({
                            name: sym.name,
                            kind: kindName,
                            detail: sym.detail,
                            range: {
                                startLine: range.start.line,
                                endLine: range.end.line,
                                startChar: range.start.character,
                                endChar: range.end.character
                            },
                            content: subVal,
                            parent: parentName,
                            hierarchy: currentHierarchy
                        });
                    });
                }

                if (sym.children && sym.children.length > 0) {
                    sym.children.forEach((child: any) => processSymbol(child, sym.name, currentHierarchy));
                }
            };

            symbols.forEach(s => processSymbol(s));

        } else {
            // 3. Fallback: Chunk raw text
            // logger.info(`Fallback chunking for ${filePath}`); // Too verbose?
            const chunks = splitContent(fullText);
            chunks.forEach((chunkText, idx) => {
                finalChunks.push({
                    name: path.basename(filePath) + (idx > 0 ? ` (Part ${idx + 1})` : ''),
                    kind: 'File',
                    detail: `Text content ${idx + 1}/${chunks.length}`,
                    range: { startLine: 0, endLine: splitLines.length, startChar: 0, endChar: 0 },
                    content: chunkText,
                    hierarchy: [path.basename(filePath)]
                });
            });
        }

        return JSON.stringify(finalChunks, null, 2);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to semantically chunk ${filePath}:`, error);
        return JSON.stringify([]);
    }
}
