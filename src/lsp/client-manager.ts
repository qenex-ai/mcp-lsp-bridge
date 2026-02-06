import { BaseLSPClient } from './base-client.js';
import { DocumentManager } from './document-manager.js';
import { getConfigForExtension } from '../config/lsp-servers.js';
import { getFileExtension } from '../utils/uri.js';
import { logger } from '../utils/logger.js';
import type { LSPServerConfig } from '../types/index.js';

/**
 * Manages multiple LSP clients for different languages
 */
export class ClientManager {
  private clients: Map<string, BaseLSPClient> = new Map();
  private documentManager: DocumentManager = new DocumentManager();
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Get or create an LSP client for a file
   * @param filePath Absolute file path
   * @returns LSP client and language ID
   */
  async getClientForFile(filePath: string): Promise<{ client: BaseLSPClient; languageId: string }> {
    const extension = getFileExtension(filePath);
    const config = getConfigForExtension(extension);

    if (!config) {
      throw new Error(`Unsupported file extension: ${extension}`);
    }

    return {
      client: await this.getClient(config),
      languageId: config.language,
    };
  }

  /**
   * Get or create an LSP client for a language
   * @param config LSP server configuration
   * @returns LSP client
   */
  private async getClient(config: LSPServerConfig): Promise<BaseLSPClient> {
    const existing = this.clients.get(config.language);

    if (existing && existing.isReady()) {
      return existing;
    }

    // Create new client
    logger.info(`Creating new LSP client for ${config.language}`);

    const client = new BaseLSPClient(config, this.workspaceRoot);

    // Store before starting (to avoid race conditions)
    this.clients.set(config.language, client);

    try {
      await client.start();
      return client;
    } catch (error) {
      // Remove failed client
      this.clients.delete(config.language);
      throw error;
    }
  }

  /**
   * Get the document manager
   * @returns Document manager
   */
  getDocumentManager(): DocumentManager {
    return this.documentManager;
  }

  /**
   * Open a document in the appropriate LSP server
   * @param filePath Absolute file path
   * @returns Document URI
   */
  async openDocument(filePath: string): Promise<string> {
    const { client } = await this.getClientForFile(filePath);
    return this.documentManager.openDocument(client, filePath);
  }

  /**
   * Close a document in the appropriate LSP server
   * @param filePath Absolute file path
   */
  async closeDocument(filePath: string): Promise<void> {
    const { client } = await this.getClientForFile(filePath);
    this.documentManager.closeDocument(client, filePath);
  }

  /**
   * Update a document in the appropriate LSP server
   * @param filePath Absolute file path
   * @param newText New document text
   */
  async updateDocument(filePath: string, newText?: string): Promise<void> {
    const { client } = await this.getClientForFile(filePath);
    await this.documentManager.updateDocument(client, filePath, newText);
  }

  /**
   * Check if a document is open
   * @param filePath Absolute file path
   * @returns True if the document is open
   */
  isDocumentOpen(filePath: string): boolean {
    return this.documentManager.isDocumentOpen(filePath);
  }

  /**
   * Ensure a document is open (open it if not already)
   * @param filePath Absolute file path
   * @returns Document URI
   */
  async ensureDocumentOpen(filePath: string): Promise<string> {
    if (this.isDocumentOpen(filePath)) {
      const docInfo = this.documentManager.getDocument(filePath);
      return docInfo!.uri;
    }

    return this.openDocument(filePath);
  }

  /**
   * Send a request to the appropriate LSP server for a file
   * @param filePath Absolute file path
   * @param method LSP method name
   * @param params Request parameters
   * @param timeoutMs Request timeout in milliseconds
   * @returns LSP response
   */
  async sendRequest(
    filePath: string,
    method: string,
    params: unknown,
    timeoutMs?: number
  ): Promise<unknown> {
    const { client } = await this.getClientForFile(filePath);

    // Ensure document is open before sending request
    await this.ensureDocumentOpen(filePath);

    return client.sendRequest(method, params, timeoutMs);
  }

  /**
   * Shutdown all LSP clients
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down all LSP clients...');

    const shutdownPromises: Promise<void>[] = [];

    for (const [language, client] of this.clients.entries()) {
      logger.info(`Shutting down ${language} LSP client`);

      // Close all documents for this client
      this.documentManager.closeAllDocuments(client);

      // Shutdown the client
      shutdownPromises.push(
        client.shutdown().catch((error) => {
          logger.error(`Error shutting down ${language} LSP client:`, error);
        })
      );
    }

    await Promise.all(shutdownPromises);

    this.clients.clear();
    logger.info('All LSP clients shut down');
  }

  /**
   * Get all active LSP clients
   * @returns Map of language ID to LSP client
   */
  getActiveClients(): Map<string, BaseLSPClient> {
    return new Map(this.clients);
  }

  /**
   * Get the workspace root
   * @returns Workspace root path
   */
  get workspaceRootPath(): string {
    return this.workspaceRoot;
  }

  /**
   * Set the workspace root (must be done before any clients are started)
   * @param workspaceRoot New workspace root path
   */
  setWorkspaceRoot(workspaceRoot: string): void {
    if (this.clients.size > 0) {
      throw new Error('Cannot change workspace root after clients have been started');
    }
    this.workspaceRoot = workspaceRoot;
  }
}
