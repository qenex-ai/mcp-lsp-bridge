import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { Diagnostic } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatDiagnosticsResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_diagnostics arguments
 */
export const DiagnosticsArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
});

/**
 * lsp_diagnostics tool handler
 * Get diagnostics (errors, warnings, etc.) for a document
 */
export async function handleDiagnostics(
  args: z.infer<typeof DiagnosticsArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  logger.info(`Getting diagnostics for ${filePath}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send diagnostic request (textDocument/diagnostic for pull diagnostics)
    // Note: Some servers use push diagnostics via publishDiagnostics notification
    // For now, we'll try the pull model, but may need to track push diagnostics too
    let result: { items?: Diagnostic[] } | Diagnostic[] | null;

    try {
      result = await clientManager.sendRequest(
        filePath,
        'textDocument/diagnostic',
        {
          textDocument: { uri },
        },
        5000 // Shorter timeout for diagnostics
      ) as { items?: Diagnostic[] } | null;
    } catch (error) {
      // If pull diagnostics not supported, we need to track push diagnostics
      // For now, return a message indicating we need to implement push diagnostics tracking
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('Method not found') || message.includes('not supported')) {
        throw new Error(
          'This LSP server does not support pull diagnostics. ' +
          'Diagnostics are pushed by the server automatically. ' +
          'Future versions will track these diagnostics.'
        );
      }

      throw error;
    }

    // Extract diagnostics from result
    let diagnostics: Diagnostic[];

    if (!result) {
      diagnostics = [];
    } else if (Array.isArray(result)) {
      diagnostics = result;
    } else if ('items' in result && result.items) {
      diagnostics = result.items;
    } else {
      diagnostics = [];
    }

    // Format the result
    return formatDiagnosticsResult(diagnostics);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get diagnostics for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Diagnostics request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to get diagnostics: ${message}`);
  }
}
