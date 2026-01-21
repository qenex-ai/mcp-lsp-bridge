import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { WorkspaceEdit } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatWorkspaceEditResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_rename arguments
 */
export const RenameArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  line: z.number().describe('Line number (zero-based)'),
  character: z.number().describe('Character offset on the line (zero-based)'),
  newName: z.string().describe('New name for the symbol'),
});

/**
 * lsp_rename tool handler
 * Rename a symbol across the workspace
 */
export async function handleRename(
  args: z.infer<typeof RenameArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath, line, character, newName } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  // Validate position
  if (line < 0 || character < 0) {
    throw new Error(`Line and character must be non-negative (got line=${line}, character=${character})`);
  }

  // Validate new name
  if (!newName || newName.trim() === '') {
    throw new Error('New name cannot be empty');
  }

  logger.info(`Renaming symbol at ${filePath}:${line}:${character} to "${newName}"`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send rename request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/rename',
      {
        textDocument: { uri },
        position: { line, character },
        newName,
      }
    ) as WorkspaceEdit | null;

    // Format the result
    return formatWorkspaceEditResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to rename symbol at ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Rename request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to rename symbol: ${message}`);
  }
}
