import { z } from 'zod';
import type { ClientManager } from '../lsp/client-manager.js';
import { logger } from '../utils/logger.js';
import { isAbsolutePath } from '../utils/uri.js';

/**
 * Schema for lsp_open_document arguments
 */
export const OpenDocumentArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path to open'),
});

/**
 * Schema for lsp_close_document arguments
 */
export const CloseDocumentArgsSchema = z.object({
  filePath: z.string().describe('Absolute file path to close'),
});

/**
 * lsp_open_document tool handler
 * Opens a document in the appropriate LSP server
 */
export async function handleOpenDocument(
  args: z.infer<typeof OpenDocumentArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  logger.info(`Opening document: ${filePath}`);

  try {
    // Check if already open
    if (clientManager.isDocumentOpen(filePath)) {
      return `Document is already open: ${filePath}`;
    }

    // Open the document
    const uri = await clientManager.openDocument(filePath);

    return `Successfully opened document: ${filePath}\nURI: ${uri}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to open document ${filePath}:`, error);

    // Provide helpful error messages
    if (message.includes('ENOENT')) {
      throw new Error(`File not found: ${filePath}`);
    } else if (message.includes('Unsupported file extension')) {
      throw new Error(`${message}\n\nSupported languages: TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, HTML, CSS, JSON, YAML, Bash`);
    } else if (message.includes('spawn') || message.includes('ENOENT')) {
      throw new Error(`LSP server not found. Please ensure the appropriate language server is installed.\n\nError: ${message}`);
    }

    throw new Error(`Failed to open document: ${message}`);
  }
}

/**
 * lsp_close_document tool handler
 * Closes a document in the appropriate LSP server
 */
export async function handleCloseDocument(
  args: z.infer<typeof CloseDocumentArgsSchema>,
  clientManager: ClientManager
): Promise<string> {
  const { filePath } = args;

  // Validate file path
  if (!isAbsolutePath(filePath)) {
    throw new Error(`File path must be absolute: ${filePath}`);
  }

  logger.info(`Closing document: ${filePath}`);

  try {
    // Check if document is open
    if (!clientManager.isDocumentOpen(filePath)) {
      return `Document is not open: ${filePath}`;
    }

    // Close the document
    await clientManager.closeDocument(filePath);

    return `Successfully closed document: ${filePath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to close document ${filePath}:`, error);
    throw new Error(`Failed to close document: ${message}`);
  }
}
