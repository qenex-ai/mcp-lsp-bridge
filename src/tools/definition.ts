import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { Location, LocationLink } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatDefinitionResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_definition arguments
 */
export const DefinitionArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  line: z.number().describe('Line number (zero-based)'),
  character: z.number().describe('Character offset on the line (zero-based)'),
});

/**
 * lsp_definition tool handler
 * Go to the definition of a symbol at a specific position
 */
export async function handleDefinition(
  args: z.infer<typeof DefinitionArgsSchema>,
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

  logger.info(`Getting definition for ${filePath}:${line}:${character}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send definition request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/definition',
      {
        textDocument: { uri },
        position: { line, character },
      }
    ) as Location | Location[] | LocationLink[] | null;

    // Format the result
    return formatDefinitionResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get definition for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Definition request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to get definition: ${message}`);
  }
}
