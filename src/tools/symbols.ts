import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { SymbolInformation, DocumentSymbol } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatSymbolsResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_workspace_symbols arguments
 */
export const WorkspaceSymbolsArgsSchema = z.object({
  query: z.string().describe('Search query for symbols (empty string to get all symbols)'),
});

/**
 * Schema for lsp_document_symbols arguments
 */
export const DocumentSymbolsArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
});

/**
 * lsp_workspace_symbols tool handler
 * Search for symbols across the entire workspace
 */
export async function handleWorkspaceSymbols(
  args: z.infer<typeof WorkspaceSymbolsArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { query } = args;

  logger.info(`Searching workspace symbols with query: "${query}"`);

  try {
    // Get any client (workspace symbols work across all files)
    const clients = clientManager.getActiveClients();

    if (clients.size === 0) {
      throw new Error('No active LSP clients. Please open a document first.');
    }

    // Use the first available client
    const client = Array.from(clients.values())[0];

    // Send workspace symbols request
    const result = await client.sendRequest(
      'workspace/symbol',
      { query }
    ) as SymbolInformation[] | null;

    // Format the result
    return formatSymbolsResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to search workspace symbols:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Workspace symbols request timed out. The LSP server may be busy or unresponsive.`);
    } else if (message.includes('Method not found')) {
      throw new Error('This LSP server does not support workspace symbol search.');
    }

    throw new Error(`Failed to search workspace symbols: ${message}`);
  }
}

/**
 * lsp_document_symbols tool handler
 * Get the symbol outline/structure of a document
 */
export async function handleDocumentSymbols(
  args: z.infer<typeof DocumentSymbolsArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  logger.info(`Getting document symbols for ${filePath}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send document symbols request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/documentSymbol',
      {
        textDocument: { uri },
      }
    ) as SymbolInformation[] | DocumentSymbol[] | null;

    // Format the result
    return formatSymbolsResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get document symbols for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Document symbols request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to get document symbols: ${message}`);
  }
}
