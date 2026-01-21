import { readFile } from 'node:fs/promises';
import type { BaseLSPClient } from './base-client.js';
import type { DocumentInfo } from '../types/index.js';
import { pathToUri } from '../utils/uri.js';
import { getLanguageIdForExtension } from '../config/lsp-servers.js';
import { getFileExtension } from '../utils/uri.js';
import { logger } from '../utils/logger.js';

/**
 * Manages document lifecycle and synchronization with LSP servers
 */
export class DocumentManager {
  private documents: Map<string, DocumentInfo> = new Map();

  /**
   * Open a document in the LSP server
   * @param client LSP client to use
   * @param filePath Absolute file path
   * @returns Document URI
   */
  async openDocument(client: BaseLSPClient, filePath: string): Promise<string> {
    const uri = pathToUri(filePath);

    // Check if already open
    if (this.documents.has(uri)) {
      logger.debug(`Document already open: ${uri}`);
      return uri;
    }

    try {
      // Read the file content
      const text = await readFile(filePath, 'utf8');

      // Get language ID from file extension
      const extension = getFileExtension(filePath);
      const languageId = getLanguageIdForExtension(extension);

      if (!languageId) {
        throw new Error(`Unsupported file extension: ${extension}`);
      }

      // Create document info
      const docInfo: DocumentInfo = {
        uri,
        languageId,
        version: 1,
        text,
      };

      // Store document info
      this.documents.set(uri, docInfo);

      // Send didOpen notification to LSP server
      client.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId,
          version: docInfo.version,
          text,
        },
      });

      logger.info(`Opened document: ${uri}`);

      return uri;
    } catch (error) {
      logger.error(`Failed to open document ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Close a document in the LSP server
   * @param client LSP client to use
   * @param filePath Absolute file path
   */
  closeDocument(client: BaseLSPClient, filePath: string): void {
    const uri = pathToUri(filePath);

    if (!this.documents.has(uri)) {
      logger.debug(`Document not open: ${uri}`);
      return;
    }

    // Remove from tracking
    this.documents.delete(uri);

    // Send didClose notification to LSP server
    client.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });

    logger.info(`Closed document: ${uri}`);
  }

  /**
   * Update document content in the LSP server
   * @param client LSP client to use
   * @param filePath Absolute file path
   * @param newText New document text
   */
  async updateDocument(client: BaseLSPClient, filePath: string, newText?: string): Promise<void> {
    const uri = pathToUri(filePath);
    const docInfo = this.documents.get(uri);

    if (!docInfo) {
      throw new Error(`Document not open: ${uri}`);
    }

    // If no new text provided, re-read from file
    if (newText === undefined) {
      try {
        newText = await readFile(filePath, 'utf8');
      } catch (error) {
        logger.error(`Failed to read document ${filePath}:`, error);
        throw error;
      }
    }

    // Increment version
    docInfo.version++;
    docInfo.text = newText;

    // Send didChange notification (full document sync)
    client.sendNotification('textDocument/didChange', {
      textDocument: {
        uri,
        version: docInfo.version,
      },
      contentChanges: [
        {
          text: newText,
        },
      ],
    });

    logger.debug(`Updated document: ${uri} (version ${docInfo.version})`);
  }

  /**
   * Get document info
   * @param filePath Absolute file path
   * @returns Document info, or undefined if not open
   */
  getDocument(filePath: string): DocumentInfo | undefined {
    const uri = pathToUri(filePath);
    return this.documents.get(uri);
  }

  /**
   * Check if a document is open
   * @param filePath Absolute file path
   * @returns True if the document is open
   */
  isDocumentOpen(filePath: string): boolean {
    const uri = pathToUri(filePath);
    return this.documents.has(uri);
  }

  /**
   * Get all open document URIs
   * @returns Array of document URIs
   */
  getOpenDocuments(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Close all open documents
   * @param client LSP client to use
   */
  closeAllDocuments(client: BaseLSPClient): void {
    const uris = Array.from(this.documents.keys());

    for (const uri of uris) {
      client.sendNotification('textDocument/didClose', {
        textDocument: { uri },
      });
    }

    this.documents.clear();
    logger.info(`Closed all documents`);
  }
}
