import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ClientManager } from './lsp/client-manager.js';
import { logger } from './utils/logger.js';

// Import tool schemas and handlers
import {
  OpenDocumentArgsSchema,
  CloseDocumentArgsSchema,
  handleOpenDocument,
  handleCloseDocument,
} from './tools/document-lifecycle.js';
import {
  CompletionArgsSchema,
  handleCompletion,
} from './tools/completion.js';
import {
  HoverArgsSchema,
  handleHover,
} from './tools/hover.js';
import {
  DefinitionArgsSchema,
  handleDefinition,
} from './tools/definition.js';
import {
  ReferencesArgsSchema,
  handleReferences,
} from './tools/references.js';
import {
  DiagnosticsArgsSchema,
  handleDiagnostics,
} from './tools/diagnostics.js';
import {
  RenameArgsSchema,
  handleRename,
} from './tools/rename.js';
import {
  FormatDocumentArgsSchema,
  handleFormatDocument,
} from './tools/format.js';
import {
  CodeActionArgsSchema,
  handleCodeAction,
} from './tools/code-action.js';
import {
  WorkspaceSymbolsArgsSchema,
  DocumentSymbolsArgsSchema,
  handleWorkspaceSymbols,
  handleDocumentSymbols,
} from './tools/symbols.js';
import {
  ProjectIndexArgsSchema,
  ReadAndChunkArgsSchema,
  handleProjectIndex,
  handleReadAndChunk,
} from './tools/indexing.js';
import {
  SemanticChunkArgsSchema,
  handleSemanticChunk,
} from './tools/semantic-chunking.js';
import {
  GeminiQueryArgsSchema,
  handleGeminiQuery,
} from './tools/gemini-query.js';

/**
 * Create and configure the MCP server
 */
export function createServer(workspaceRoot?: string): Server {
  // Create client manager
  const clientManager = new ClientManager(workspaceRoot);

  // Create MCP server
  const server = new Server(
    {
      name: 'mcp-lsp-bridge',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'lsp_open_document',
          description: 'Open a document in the appropriate LSP server. This must be called before using other LSP tools on a file.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path to open',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'lsp_close_document',
          description: 'Close a document in the LSP server. Call this when done working with a file.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path to close',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'lsp_completion',
          description: 'Get code completions at a specific position in a document. Returns suggestions for code that can be inserted at the position.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              line: {
                type: 'number',
                description: 'Line number (zero-based)',
              },
              character: {
                type: 'number',
                description: 'Character offset on the line (zero-based)',
              },
            },
            required: ['filePath', 'line', 'character'],
          },
        },
        {
          name: 'lsp_hover',
          description: 'Get hover information (types, documentation) at a specific position in a document.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              line: {
                type: 'number',
                description: 'Line number (zero-based)',
              },
              character: {
                type: 'number',
                description: 'Character offset on the line (zero-based)',
              },
            },
            required: ['filePath', 'line', 'character'],
          },
        },
        {
          name: 'lsp_definition',
          description: 'Go to the definition of a symbol at a specific position. Returns the location(s) where the symbol is defined.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              line: {
                type: 'number',
                description: 'Line number (zero-based)',
              },
              character: {
                type: 'number',
                description: 'Character offset on the line (zero-based)',
              },
            },
            required: ['filePath', 'line', 'character'],
          },
        },
        {
          name: 'lsp_references',
          description: 'Find all references to a symbol at a specific position. Returns all locations where the symbol is used.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              line: {
                type: 'number',
                description: 'Line number (zero-based)',
              },
              character: {
                type: 'number',
                description: 'Character offset on the line (zero-based)',
              },
              includeDeclaration: {
                type: 'boolean',
                description: 'Include the declaration in the results (default: true)',
              },
            },
            required: ['filePath', 'line', 'character'],
          },
        },
        {
          name: 'lsp_diagnostics',
          description: 'Get diagnostics (errors, warnings, info, hints) for a document.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'lsp_rename',
          description: 'Rename a symbol across the entire workspace. Returns a workspace edit with all the changes.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              line: {
                type: 'number',
                description: 'Line number (zero-based)',
              },
              character: {
                type: 'number',
                description: 'Character offset on the line (zero-based)',
              },
              newName: {
                type: 'string',
                description: 'New name for the symbol',
              },
            },
            required: ['filePath', 'line', 'character', 'newName'],
          },
        },
        {
          name: 'lsp_format_document',
          description: 'Format an entire document according to the language server\'s formatting rules.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              tabSize: {
                type: 'number',
                description: 'Number of spaces per tab (default: 2)',
              },
              insertSpaces: {
                type: 'boolean',
                description: 'Use spaces instead of tabs (default: true)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'lsp_code_action',
          description: 'Get available code actions (quick fixes, refactorings) for a range in a document.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
              startLine: {
                type: 'number',
                description: 'Start line number (zero-based)',
              },
              startCharacter: {
                type: 'number',
                description: 'Start character offset (zero-based)',
              },
              endLine: {
                type: 'number',
                description: 'End line number (zero-based)',
              },
              endCharacter: {
                type: 'number',
                description: 'End character offset (zero-based)',
              },
            },
            required: ['filePath', 'startLine', 'startCharacter', 'endLine', 'endCharacter'],
          },
        },
        {
          name: 'lsp_workspace_symbols',
          description: 'Search for symbols across the entire workspace. Useful for finding classes, functions, variables, etc.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for symbols (empty string to get all symbols)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'lsp_document_symbols',
          description: 'Get the symbol outline/structure of a document. Returns a hierarchical list of symbols.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'project_index',
          description: 'Recursively index the project workspace to discover files and directories.',
          inputSchema: {
            type: 'object',
            properties: {
              rootPath: {
                type: 'string',
                description: 'Root directory to start indexing from (default: workspace root)',
              },
              maxDepth: {
                type: 'number',
                description: 'Maximum recursion depth (default: 10)',
              },
              exclude: {
                type: 'array',
                items: { type: 'string' },
                description: 'Directory names to exclude (node_modules, .git, etc.)',
              },
            },
          },
        },
        {
          name: 'read_and_chunk',
          description: 'Read a file and split it into text chunks for processing.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path to read',
              },
              chunkSize: {
                type: 'number',
                description: 'Character count per chunk (default: 2000)',
              },
              overlap: {
                type: 'number',
                description: 'Character overlap between chunks (default: 200)',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'semantic_chunk',
          description: 'Parse a document into semantic chunks based on the code structure (classes, functions, etc.).',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Absolute file path to chunk',
              },
            },
            required: ['filePath'],
          },
        },
        {
          name: 'gemini_query',
          description: 'Ask a natural language question about the codebase. Uses the semantic index to find relevant code and prompts Gemini for an answer.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The question to ask (e.g. "How does indexing work?")',
              },
            },
            required: ['query'],
          },
        },
      ],
    };
  });

  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case 'lsp_open_document': {
          const parsed = OpenDocumentArgsSchema.parse(args);
          result = await handleOpenDocument(parsed, clientManager);
          break;
        }

        case 'lsp_close_document': {
          const parsed = CloseDocumentArgsSchema.parse(args);
          result = await handleCloseDocument(parsed, clientManager);
          break;
        }

        case 'lsp_completion': {
          const parsed = CompletionArgsSchema.parse(args);
          result = await handleCompletion(parsed, clientManager);
          break;
        }

        case 'lsp_hover': {
          const parsed = HoverArgsSchema.parse(args);
          result = await handleHover(parsed, clientManager);
          break;
        }

        case 'lsp_definition': {
          const parsed = DefinitionArgsSchema.parse(args);
          result = await handleDefinition(parsed, clientManager);
          break;
        }

        case 'lsp_references': {
          const parsed = ReferencesArgsSchema.parse(args);
          result = await handleReferences(parsed, clientManager);
          break;
        }

        case 'lsp_diagnostics': {
          const parsed = DiagnosticsArgsSchema.parse(args);
          result = await handleDiagnostics(parsed, clientManager);
          break;
        }

        case 'lsp_rename': {
          const parsed = RenameArgsSchema.parse(args);
          result = await handleRename(parsed, clientManager);
          break;
        }

        case 'lsp_format_document': {
          const parsed = FormatDocumentArgsSchema.parse(args);
          result = await handleFormatDocument(parsed, clientManager);
          break;
        }

        case 'lsp_code_action': {
          const parsed = CodeActionArgsSchema.parse(args);
          result = await handleCodeAction(parsed, clientManager);
          break;
        }

        case 'lsp_workspace_symbols': {
          const parsed = WorkspaceSymbolsArgsSchema.parse(args);
          result = await handleWorkspaceSymbols(parsed, clientManager);
          break;
        }

        case 'lsp_document_symbols': {
          const parsed = DocumentSymbolsArgsSchema.parse(args);
          result = await handleDocumentSymbols(parsed, clientManager);
          break;
        }

        case 'project_index': {
          const parsed = ProjectIndexArgsSchema.parse(args);
          result = await handleProjectIndex(parsed, clientManager.workspaceRootPath);
          break;
        }

        case 'read_and_chunk': {
          const parsed = ReadAndChunkArgsSchema.parse(args);
          result = await handleReadAndChunk(parsed);
          break;
        }

        case 'semantic_chunk': {
          const parsed = SemanticChunkArgsSchema.parse(args);
          result = await handleSemanticChunk(parsed, clientManager);
          break;
        }

        case 'gemini_query': {
          const parsed = GeminiQueryArgsSchema.parse(args);
          // Pass workspace root from clientManager
          result = await handleGeminiQuery(parsed, clientManager.workspaceRootPath);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Tool ${name} error:`, error);

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down MCP server...');
    await clientManager.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down MCP server...');
    await clientManager.shutdown();
    process.exit(0);
  });

  return server;
}

/**
 * Run the MCP server
 */
export async function runServer(workspaceRoot?: string): Promise<void> {
  const server = createServer(workspaceRoot);

  // Use stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP-LSP Bridge server started');
}
