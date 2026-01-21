import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { TextEdit } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatTextEditsResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_format_document arguments
 */
export const FormatDocumentArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  tabSize: z.number().optional().describe('Number of spaces per tab (default: 2)'),
  insertSpaces: z.boolean().optional().describe('Use spaces instead of tabs (default: true)'),
});

/**
 * lsp_format_document tool handler
 * Format an entire document
 */
export async function handleFormatDocument(
  args: z.infer<typeof FormatDocumentArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath, tabSize = 2, insertSpaces = true } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  logger.info(`Formatting document ${filePath}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send formatting request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/formatting',
      {
        textDocument: { uri },
        options: {
          tabSize,
          insertSpaces,
        },
      }
    ) as TextEdit[] | null;

    // Format the result
    if (!result || result.length === 0) {
      return `No formatting changes needed for ${filePath}`;
    }

    return formatTextEditsResult(result, filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to format document ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Format request timed out. The LSP server may be busy or unresponsive.`);
    } else if (message.includes('Method not found')) {
      throw new Error('This LSP server does not support document formatting.');
    }

    throw new Error(`Failed to format document: ${message}`);
  }
}
