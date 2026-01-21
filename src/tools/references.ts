import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { Location } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatReferencesResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_references arguments
 */
export const ReferencesArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  line: z.number().describe('Line number (zero-based)'),
  character: z.number().describe('Character offset on the line (zero-based)'),
  includeDeclaration: z.boolean().optional().describe('Include the declaration in the results (default: true)'),
});

/**
 * lsp_references tool handler
 * Find all references to a symbol at a specific position
 */
export async function handleReferences(
  args: z.infer<typeof ReferencesArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath, line, character, includeDeclaration = true } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  // Validate position
  if (line < 0 || character < 0) {
    throw new Error(`Line and character must be non-negative (got line=${line}, character=${character})`);
  }

  logger.info(`Finding references for ${filePath}:${line}:${character}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send references request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/references',
      {
        textDocument: { uri },
        position: { line, character },
        context: {
          includeDeclaration,
        },
      }
    ) as Location[] | null;

    // Format the result
    return formatReferencesResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to find references for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`References request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to find references: ${message}`);
  }
}
