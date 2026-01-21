import type {
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  TextDocumentItem,
  VersionedTextDocumentIdentifier,
  TextDocumentContentChangeEvent,
  CompletionList,
  CompletionItem,
  Hover,
  Location,
  LocationLink,
  Diagnostic,
  WorkspaceEdit,
  DocumentFormattingParams,
  TextEdit,
  SymbolInformation,
  DocumentSymbol,
  CodeAction,
  Command,
} from 'vscode-languageserver-protocol';

/**
 * Configuration for an LSP server
 */
export interface LSPServerConfig {
  /** Language ID (e.g., 'typescript', 'python') */
  language: string;
  /** File extensions this server handles (e.g., ['.ts', '.tsx']) */
  extensions: string[];
  /** Command to launch the LSP server */
  command: string;
  /** Command-line arguments */
  args: string[];
  /** Initialization options passed to LSP server */
  initializationOptions?: Record<string, unknown>;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * LSP client state
 */
export interface LSPClientState {
  /** Whether the client is initialized */
  initialized: boolean;
  /** Server capabilities received during initialization */
  capabilities?: ServerCapabilities;
  /** Process ID of the LSP server */
  processId?: number;
}

/**
 * Document information tracked by DocumentManager
 */
export interface DocumentInfo {
  /** Document URI */
  uri: string;
  /** Language ID */
  languageId: string;
  /** Document version (incremented on each change) */
  version: number;
  /** Full document text */
  text: string;
}

/**
 * Position in a document (zero-based)
 */
export interface Position {
  /** Line number (zero-based) */
  line: number;
  /** Character offset on the line (zero-based) */
  character: number;
}

/**
 * Range in a document
 */
export interface Range {
  /** Start position */
  start: Position;
  /** End position */
  end: Position;
}

/**
 * LSP request message
 */
export interface LSPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

/**
 * LSP response message
 */
export interface LSPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: LSPResponseError;
}

/**
 * LSP response error
 */
export interface LSPResponseError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * LSP notification message
 */
export interface LSPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/**
 * Common MCP tool arguments with file path
 */
export interface FileToolArgs {
  /** Absolute file path */
  filePath: string;
}

/**
 * Common MCP tool arguments with file path and position
 */
export interface PositionToolArgs extends FileToolArgs {
  /** Line number (zero-based) */
  line: number;
  /** Character offset (zero-based) */
  character: number;
}

/**
 * MCP tool result with formatted output
 */
export interface ToolResult {
  /** Formatted content for display to the LLM */
  content: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// Re-export commonly used LSP types
export type {
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  TextDocumentItem,
  VersionedTextDocumentIdentifier,
  TextDocumentContentChangeEvent,
  CompletionList,
  CompletionItem,
  Hover,
  Location,
  LocationLink,
  Diagnostic,
  WorkspaceEdit,
  DocumentFormattingParams,
  TextEdit,
  SymbolInformation,
  DocumentSymbol,
  CodeAction,
  Command,
};
