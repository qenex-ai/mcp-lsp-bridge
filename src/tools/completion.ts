import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { CompletionList, CompletionItem } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatCompletionResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_completion arguments
 */
export const CompletionArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  line: z.number().describe('Line number (zero-based)'),
  character: z.number().describe('Character offset on the line (zero-based)'),
});

/**
 * lsp_completion tool handler
 * Get code completions at a specific position in a document
 */
export async function handleCompletion(
  args: z.infer<typeof CompletionArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath, line, character } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  // Validate position
  if (line < 0 || character < 0) {
    throw new Error(`Line and character must be non-negative (got line=${line}, character=${character})`);
  }

  logger.info(`Getting completions for ${filePath}:${line}:${character}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send completion request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/completion',
      {
        textDocument: { uri },
        position: { line, character },
      }
    ) as CompletionList | CompletionItem[] | null;

    // Format the result
    return formatCompletionResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get completions for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Completion request timed out. The LSP server may be busy or unresponsive.`);
    } else if (message.includes('not running')) {
      throw new Error(`LSP server is not running. Please try opening the document first.`);
    }

    throw new Error(`Failed to get completions: ${message}`);
  }
}
