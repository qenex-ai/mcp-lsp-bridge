# MCP-LSP Bridge

A Model Context Protocol (MCP) server that bridges to multiple Language Server Protocol (LSP) servers, exposing language intelligence capabilities as MCP tools for Claude and other AI assistants.

## Features

- **Multi-Language Support**: Works with TypeScript, JavaScript, Python, Go, Rust, Java, C/C++, Ruby, PHP, HTML, CSS, JSON, YAML, and Bash
- **Code Intelligence**: Completions, hover info, go-to-definition, find references, diagnostics
- **Refactoring**: Rename symbols, format documents, code actions (quick fixes)
- **Navigation**: Workspace symbols, document outline
- **Lazy Initialization**: LSP servers are started on-demand for better performance
- **Concurrent Support**: Manage multiple language servers simultaneously

## Architecture

```
Claude → MCP Tools → Protocol Translator → Client Manager → LSP Clients → LSP Servers
```

## Installation

### 1. Install the MCP-LSP Bridge

```bash
cd /mcp-lsp-bridge
npm install
npm run build
```

## Deployment Options

The MCP-LSP Bridge can be used in two ways:

### Local Mode (STDIO)
Run as a local process that communicates via STDIO (standard input/output). This is the default mode and works well for personal use with Claude Code.

### Remote Mode (HTTP)
Run as an HTTP server that can be accessed remotely via URL. This allows multiple users/clients to connect to the same MCP server over the network.

**Your MCP URL:** `https://qenex.ai/mcp`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### 2. Install Language Servers

Install the LSP servers for the languages you want to use:

#### TypeScript/JavaScript
```bash
npm install -g typescript typescript-language-server
```

#### Python
```bash
pip install 'python-lsp-server[all]'
```

#### Go
```bash
go install golang.org/x/tools/gopls@latest
```

#### Rust
```bash
rustup component add rust-analyzer
```

#### C/C++
Install clangd from your package manager or LLVM.

#### Other Languages
See the [Language Server Installation Guide](#language-server-installation-guide) below.

### 3. Configure Claude Code

#### Option A: Local STDIO Mode

Add the MCP server to your Claude Code configuration:

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "node",
      "args": ["/mcp-lsp-bridge/dist/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/path/to/your/workspace"
      }
    }
  }
}
```

Or use `npm run dev` for development:

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/mcp-lsp-bridge",
      "env": {
        "WORKSPACE_ROOT": "/path/to/your/workspace"
      }
    }
  }
}
```

#### Option B: Remote HTTP Mode

**Start the HTTP server:**

```bash
# Development
npm run dev:http

# Production (after building)
npm run start:http
```

**Configure Claude Code to use the remote server:**

```json
{
  "mcpServers": {
    "lsp-bridge-remote": {
      "url": "https://qenex.ai/mcp",
      "transport": "streamableHttp"
    }
  }
}
```

**Environment variables for HTTP server:**

Create a `.env` file (see `.env.example`):
```bash
PORT=3000
HOST=0.0.0.0
WORKSPACE_ROOT=/path/to/your/workspace
ALLOWED_HOSTS=qenex.ai,localhost
LOG_LEVEL=INFO
```

## Available Tools

### Document Lifecycle

#### `lsp_open_document`
Open a document in the appropriate LSP server. Must be called before using other LSP tools on a file.

**Arguments:**
- `filePath` (string): Absolute file path to open

**Example:**
```
lsp_open_document { "filePath": "/workspace/src/index.ts" }
```

#### `lsp_close_document`
Close a document in the LSP server.

**Arguments:**
- `filePath` (string): Absolute file path to close

### Code Intelligence

#### `lsp_completion`
Get code completions at a specific position.

**Arguments:**
- `filePath` (string): Absolute file path
- `line` (number): Line number (zero-based)
- `character` (number): Character offset (zero-based)

**Example:**
```
lsp_completion {
  "filePath": "/workspace/src/index.ts",
  "line": 10,
  "character": 5
}
```

#### `lsp_hover`
Get hover information (types, documentation) at a position.

**Arguments:**
- `filePath` (string): Absolute file path
- `line` (number): Line number (zero-based)
- `character` (number): Character offset (zero-based)

#### `lsp_definition`
Go to the definition of a symbol.

**Arguments:**
- `filePath` (string): Absolute file path
- `line` (number): Line number (zero-based)
- `character` (number): Character offset (zero-based)

#### `lsp_references`
Find all references to a symbol.

**Arguments:**
- `filePath` (string): Absolute file path
- `line` (number): Line number (zero-based)
- `character` (number): Character offset (zero-based)
- `includeDeclaration` (boolean, optional): Include the declaration (default: true)

#### `lsp_diagnostics`
Get diagnostics (errors, warnings) for a document.

**Arguments:**
- `filePath` (string): Absolute file path

### Refactoring & Editing

#### `lsp_rename`
Rename a symbol across the workspace.

**Arguments:**
- `filePath` (string): Absolute file path
- `line` (number): Line number (zero-based)
- `character` (number): Character offset (zero-based)
- `newName` (string): New name for the symbol

#### `lsp_format_document`
Format an entire document.

**Arguments:**
- `filePath` (string): Absolute file path
- `tabSize` (number, optional): Spaces per tab (default: 2)
- `insertSpaces` (boolean, optional): Use spaces vs tabs (default: true)

#### `lsp_code_action`
Get available code actions (quick fixes, refactorings).

**Arguments:**
- `filePath` (string): Absolute file path
- `startLine` (number): Start line (zero-based)
- `startCharacter` (number): Start character (zero-based)
- `endLine` (number): End line (zero-based)
- `endCharacter` (number): End character (zero-based)

### Navigation

#### `lsp_workspace_symbols`
Search for symbols across the workspace.

**Arguments:**
- `query` (string): Search query (empty for all symbols)

#### `lsp_document_symbols`
Get the symbol outline of a document.

**Arguments:**
- `filePath` (string): Absolute file path

## Usage Examples

### Example 1: Get TypeScript Completions

```
User: "Get completions for my TypeScript file at line 10, character 5"

Claude uses:
1. lsp_open_document { "filePath": "/workspace/src/app.ts" }
2. lsp_completion { "filePath": "/workspace/src/app.ts", "line": 10, "character": 5 }
```

### Example 2: Find All References

```
User: "Find all places where the 'handleClick' function is used"

Claude uses:
1. lsp_open_document { "filePath": "/workspace/src/utils.ts" }
2. lsp_references { "filePath": "/workspace/src/utils.ts", "line": 25, "character": 10 }
```

### Example 3: Rename a Variable

```
User: "Rename the variable 'oldName' to 'newName'"

Claude uses:
1. lsp_open_document { "filePath": "/workspace/src/main.py" }
2. lsp_rename {
     "filePath": "/workspace/src/main.py",
     "line": 5,
     "character": 4,
     "newName": "newName"
   }
```

## Language Server Installation Guide

### TypeScript/JavaScript
```bash
npm install -g typescript typescript-language-server
```

### Python
```bash
pip install 'python-lsp-server[all]'
```

### Go
```bash
go install golang.org/x/tools/gopls@latest
```
Ensure `$GOPATH/bin` is in your PATH.

### Rust
```bash
rustup component add rust-analyzer
```

### Java
Download Eclipse JDT Language Server from [eclipse.org/jdtls](https://projects.eclipse.org/projects/eclipse.jdt.ls)

### C/C++
**Ubuntu/Debian:**
```bash
sudo apt install clangd
```

**macOS:**
```bash
brew install llvm
```

### Ruby
```bash
gem install solargraph
```

### PHP
```bash
composer global require felixfbecker/language-server
```
Ensure Composer's bin directory is in your PATH.

### HTML/CSS/JSON
```bash
npm install -g vscode-langservers-extracted
```

### YAML
```bash
npm install -g yaml-language-server
```

### Bash
```bash
npm install -g bash-language-server
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Environment Variables

- `WORKSPACE_ROOT`: Set the workspace root directory (default: current directory)
- `LOG_LEVEL`: Set logging level: DEBUG, INFO, WARN, ERROR (default: INFO)

## Troubleshooting

### LSP Server Not Found

If you see "LSP server not found" errors, ensure the language server is installed and in your PATH:

```bash
# Check if the command is available
which typescript-language-server
which pylsp
which gopls
```

### Document Must Be Opened First

Most LSP operations require a document to be opened first:

```
lsp_open_document { "filePath": "/path/to/file.ts" }
```

### Timeouts

If requests timeout, the LSP server may be busy analyzing the workspace. Try:
1. Waiting for the initial workspace analysis to complete
2. Using a smaller workspace
3. Checking LSP server logs

### Unsupported File Extension

The server only supports file extensions configured in `src/config/lsp-servers.ts`. To add support for a new language:

1. Install the LSP server
2. Add configuration to `lsp-servers.ts`
3. Rebuild the project

## Technical Details

### Position Indexing

All line and character positions are **zero-based**:
- First line: `line: 0`
- First character: `character: 0`

### Document Synchronization

- Documents use **full synchronization** (entire document content sent on changes)
- Documents must be explicitly opened with `lsp_open_document`
- Documents should be closed with `lsp_close_document` when done

### LSP Server Lifecycle

- LSP servers are started **lazily** on first use
- One LSP server process per language
- Servers are kept alive for the session
- Graceful shutdown on SIGINT/SIGTERM

### Supported LSP Features

- ✅ Completion (textDocument/completion)
- ✅ Hover (textDocument/hover)
- ✅ Definition (textDocument/definition)
- ✅ References (textDocument/references)
- ✅ Diagnostics (textDocument/diagnostic)
- ✅ Rename (textDocument/rename)
- ✅ Formatting (textDocument/formatting)
- ✅ Code Action (textDocument/codeAction)
- ✅ Workspace Symbols (workspace/symbol)
- ✅ Document Symbols (textDocument/documentSymbol)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Acknowledgments

- Built with [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- Uses [vscode-languageserver-protocol](https://github.com/microsoft/vscode-languageserver-node)
