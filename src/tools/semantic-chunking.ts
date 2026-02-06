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
            { textDocument: { uri } }
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

        const processSymbol = (sym: any, parentName?: string): SemanticChunk => {
            // Handle both DocumentSymbol (has .range) and SymbolInformation (has .location.range)
            const range = sym.range || (sym.location && sym.location.range);
            // const selectionRange = sym.selectionRange || range; // Fallback - removed unused

            const kindName = SymbolKindNames[sym.kind] || 'Unknown';

            const chunk: SemanticChunk = {
                name: sym.name,
                kind: kindName,
                detail: sym.detail,
                range: {
                    startLine: range.start.line,
                    endLine: range.end.line,
                    startChar: range.start.character,
                    endChar: range.end.character
                },
                content: getText(range),
                parent: parentName
            };

            if (sym.children && sym.children.length > 0) {
                chunk.children = sym.children.map((child: any) => processSymbol(child, sym.name));
            }

            return chunk;
        };

        const chunks = symbols.map(s => processSymbol(s));

        return JSON.stringify(chunks, null, 2);

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to semantically chunk ${filePath}:`, error);
        throw new Error(`Failed to semantically chunk: ${message}`);
    }
}
