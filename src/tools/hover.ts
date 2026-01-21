import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { Hover } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatHoverResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_hover arguments
 */
export const HoverArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  line: z.number().describe('Line number (zero-based)'),
  character: z.number().describe('Character offset on the line (zero-based)'),
});

/**
 * lsp_hover tool handler
 * Get hover information (types, documentation) at a specific position
 */
export async function handleHover(
  args: z.infer<typeof HoverArgsSchema>,
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

  logger.info(`Getting hover info for ${filePath}:${line}:${character}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send hover request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/hover',
      {
        textDocument: { uri },
        position: { line, character },
      }
    ) as Hover | null;

    // Format the result
    return formatHoverResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get hover info for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Hover request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to get hover info: ${message}`);
  }
}
