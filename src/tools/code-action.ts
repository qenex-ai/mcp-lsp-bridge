import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import type { CodeAction, Command } from '../types/index.js';
import { pathToUri, isAbsolutePath } from '../utils/uri.js';
import { formatCodeActionsResult } from '../lsp/protocol-translator.js';
import { logger } from '../utils/logger.js';

/**
 * Schema for lsp_code_action arguments
 */
export const CodeActionArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path'),
  startLine: z.number().describe('Start line number (zero-based)'),
  startCharacter: z.number().describe('Start character offset (zero-based)'),
  endLine: z.number().describe('End line number (zero-based)'),
  endCharacter: z.number().describe('End character offset (zero-based)'),
});

/**
 * lsp_code_action tool handler
 * Get available code actions (quick fixes, refactorings) for a range
 */
export async function handleCodeAction(
  args: z.infer<typeof CodeActionArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath, startLine, startCharacter, endLine, endCharacter } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  // Validate positions
  if (startLine < 0 || startCharacter < 0 || endLine < 0 || endCharacter < 0) {
    throw new Error(`Line and character positions must be non-negative`);
  }

  if (startLine > endLine || (startLine === endLine && startCharacter > endCharacter)) {
    throw new Error(`Start position must be before or equal to end position`);
  }

  logger.info(`Getting code actions for ${filePath}:${startLine}:${startCharacter}-${endLine}:${endCharacter}`);

  try {
    // Ensure document is open
    await clientManager.ensureDocumentOpen(filePath);

    // Get the URI
    const uri = pathToUri(filePath);

    // Send code action request
    const result = await clientManager.sendRequest(
      filePath,
      'textDocument/codeAction',
      {
        textDocument: { uri },
        range: {
          start: { line: startLine, character: startCharacter },
          end: { line: endLine, character: endCharacter },
        },
        context: {
          diagnostics: [], // Could be populated with diagnostics for the range
        },
      }
    ) as (CodeAction | Command)[] | null;

    // Format the result
    return formatCodeActionsResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to get code actions for ${filePath}:`, error);

    if (message.includes('timed out')) {
      throw new Error(`Code action request timed out. The LSP server may be busy or unresponsive.`);
    }

    throw new Error(`Failed to get code actions: ${message}`);
  }
}
