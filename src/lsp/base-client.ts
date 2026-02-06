import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type {
  LSPServerConfig,
  LSPRequest,
  LSPResponse,
  LSPNotification,
  LSPClientState,
  InitializeParams,
  InitializeResult,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Base LSP client that communicates with an LSP server via JSON-RPC over stdio
 */
export class BaseLSPClient extends EventEmitter {
  private config: LSPServerConfig;
  private process?: ChildProcess;
  private state: LSPClientState;
  private requestId: number = 1;
  private pendingRequests: Map<number | string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  private buffer: Buffer = Buffer.alloc(0);
  private workspaceRoot: string;

  constructor(config: LSPServerConfig, workspaceRoot: string) {
    super();
    this.config = config;
    this.workspaceRoot = workspaceRoot;
    this.state = {
      initialized: false,
    };
  }

  /**
   * Start the LSP server process and initialize
   */
  async start(): Promise<void> {
    if (this.process) {
      logger.warn(`LSP client for ${this.config.language} already started`);
      return;
    }

    logger.info(`Starting LSP server: ${this.config.command} ${this.config.args.join(' ')}`);

    try {
      try {
        // Spawn the LSP server process
        this.process = spawn(this.config.command, this.config.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.config.env },
        });

        this.state.processId = this.process.pid;

        // Handle process events
        this.process.on('error', (error) => {
          logger.error(`LSP server process error for ${this.config.language}:`, error);
          // Don't re-throw, let the client logic handle connection failure
        });
      } catch (err) {
        logger.error(`Failed to spawn server for ${this.config.language}:`, err);
        throw err;
      }

      this.process.on('exit', (code, signal) => {
        logger.info(`LSP server for ${this.config.language} exited with code ${code}, signal ${signal}`);
        this.cleanup();
      });

      // Handle stderr (log output)
      this.process.stderr?.on('data', (data) => {
        logger.debug(`LSP server stderr (${this.config.language}):`, data.toString());
      });

      // Handle stdout (JSON-RPC messages)
      this.process.stdout?.on('data', (data) => {
        this.handleData(data);
      });

      // Initialize the LSP server
      await this.initialize();

      // Send initialized notification
      this.sendNotification('initialized', {});

      logger.info(`LSP server for ${this.config.language} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to start LSP server for ${this.config.language}:`, error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Initialize the LSP server
   */
  private async initialize(): Promise<void> {
    const initParams: InitializeParams = {
      processId: process.pid,
      rootUri: `file://${this.workspaceRoot}`,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: false,
            willSave: false,
            willSaveWaitUntil: false,
            didSave: false,
          },
          completion: {
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          hover: {
            contentFormat: ['markdown', 'plaintext'],
          },
          definition: {
            linkSupport: true,
          },
          references: {},
          documentSymbol: {
            hierarchicalDocumentSymbolSupport: true,
          },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: ['quickfix', 'refactor', 'refactor.extract', 'refactor.inline', 'refactor.rewrite', 'source', 'source.organizeImports'],
              },
            },
          },
          formatting: {},
          rangeFormatting: {},
          rename: {
            prepareSupport: true,
          },
        },
        workspace: {
          symbol: {},
          workspaceFolders: true,
        },
      },
      initializationOptions: this.config.initializationOptions,
      workspaceFolders: [
        {
          uri: `file://${this.workspaceRoot}`,
          name: 'workspace',
        },
      ],
    };

    const result = await this.sendRequest('initialize', initParams) as InitializeResult;
    this.state.capabilities = result.capabilities;
    this.state.initialized = true;
  }

  /**
   * Send a request to the LSP server
   */
  async sendRequest(method: string, params?: unknown, timeoutMs: number = 30000): Promise<unknown> {
    if (!this.process || !this.process.stdin) {
      throw new Error(`LSP client for ${this.config.language} is not running`);
    }

    const id = this.requestId++;
    const request: LSPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // Store the pending request
      this.pendingRequests.set(id, { resolve, reject, timeout });

      // Send the request
      const message = JSON.stringify(request);
      const content = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n${message}`;

      logger.debug(`Sending request to ${this.config.language} LSP:`, method);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.process!.stdin!.write(content, 'utf8', (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  /**
   * Send a notification to the LSP server
   */
  sendNotification(method: string, params?: unknown): void {
    if (!this.process || !this.process.stdin) {
      logger.warn(`Cannot send notification ${method}: LSP client for ${this.config.language} is not running`);
      return;
    }

    const notification: LSPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };

    const message = JSON.stringify(notification);
    const content = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n${message}`;

    logger.debug(`Sending notification to ${this.config.language} LSP:`, method);

    this.process.stdin.write(content, 'utf8');
  }

  /**
   * Handle incoming data from the LSP server
   */
  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (true) {
      // Look for header separator \r\n\r\n
      const separatorIndex = this.buffer.indexOf('\r\n\r\n');
      if (separatorIndex === -1) {
        break;
      }

      // Read header part
      const headerBuffer = this.buffer.subarray(0, separatorIndex);
      const headerString = headerBuffer.toString('utf8');

      // Look for Content-Length
      const lengthMatch = headerString.match(/Content-Length: (\d+)/i);
      if (!lengthMatch) {
        // Should not happen in healthy LSP, but maybe we have partial header? 
        // Actually if we have \r\n\r\n but no Content-Length, it's a protocol error or log noise.
        // We'll discard the header and try to recover or just break? 
        // Ideally we log and assume 0? or drop header.
        // Let's assume valid LSP for now, if match fails, maybe it's not a message header.
        // But we found the separator. Let's discard this block to progress.
        logger.warn('Missing Content-Length in header. Dropping header.');
        this.buffer = this.buffer.subarray(separatorIndex + 4);
        continue;
      }

      const contentLength = parseInt(lengthMatch[1], 10);
      const messageStart = separatorIndex + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) {
        // Wait for more data
        break;
      }

      // Extract message
      const messageBuffer = this.buffer.subarray(messageStart, messageEnd);
      this.buffer = this.buffer.subarray(messageEnd); // Remove processed message from buffer

      try {
        const messageString = messageBuffer.toString('utf8');
        const message = JSON.parse(messageString);
        this.handleMessage(message);
      } catch (error) {
        logger.error(`Failed to parse LSP message from ${this.config.language}:`, error);
      }
    }
  }

  /**
   * Handle a parsed JSON-RPC message
   */
  private handleMessage(message: LSPResponse | LSPNotification): void {
    if ('id' in message) {
      // This is a response
      this.handleResponse(message as LSPResponse);
    } else {
      // This is a notification
      this.handleNotification(message as LSPNotification);
    }
  }

  /**
   * Handle a response message
   */
  private handleResponse(response: LSPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      logger.warn(`Received response for unknown request ID: ${response.id}`);
      return;
    }

    // Clear timeout and remove from pending
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(`LSP Error: ${response.error.message}`));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Handle a notification message
   */
  private handleNotification(notification: LSPNotification): void {
    logger.debug(`Received notification from ${this.config.language} LSP:`, notification.method);

    // Emit as event so other components can listen
    this.emit('notification', notification);
  }

  /**
   * Shutdown the LSP server
   */
  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      // Send shutdown request
      await this.sendRequest('shutdown', undefined, 5000);

      // Send exit notification
      this.sendNotification('exit');

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error(`Error during shutdown of ${this.config.language} LSP:`, error);
    }

    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.process) {
      try {
        this.process.kill();
      } catch (error) {
        logger.error(`Error killing LSP process for ${this.config.language}:`, error);
      }
      this.process = undefined;
    }

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('LSP client was shut down'));
    }
    this.pendingRequests.clear();

    this.state.initialized = false;
    this.state.processId = undefined;
  }

  /**
   * Get the client state
   */
  getState(): LSPClientState {
    return { ...this.state };
  }

  /**
   * Check if the client is ready
   */
  isReady(): boolean {
    return this.state.initialized && this.process !== undefined;
  }

  /**
   * Get the server configuration
   */
  getConfig(): LSPServerConfig {
    return this.config;
  }
}
