# MCP-LSP Bridge Usage Guide

This guide shows how to use the MCP-LSP Bridge with Claude to get language intelligence for your code.

## Prerequisites

1. Install the MCP-LSP Bridge (see README.md)
2. Install language servers for the languages you want to use
3. Configure Claude Code to use the MCP server

## Example Workflows

### Workflow 1: Get TypeScript Completions

**User:** "I have a TypeScript file at `/mcp-lsp-bridge/examples/example.ts`. Can you show me what methods are available on the `message` variable at the end of the file?"

**Claude will:**
1. Open the document using `lsp_open_document`
2. Use `lsp_completion` at the position after `message.`
3. Show you all available string methods

**Example tool calls:**
```json
// 1. Open the document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Get completions (line 31, after "message.")
{
  "name": "lsp_completion",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "line": 30,
    "character": 26
  }
}
```

### Workflow 2: Find Function References

**User:** "Find all places where the `add` function is used in the TypeScript example file."

**Claude will:**
1. Open the document
2. Find the position of the `add` function definition
3. Use `lsp_references` to find all usages

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Find references to 'add' function (defined at line 8)
{
  "name": "lsp_references",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "line": 8,
    "character": 9
  }
}
```

### Workflow 3: Get Type Information

**User:** "What is the type of the `result1` variable in the TypeScript example?"

**Claude will:**
1. Open the document
2. Use `lsp_hover` to get type information

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Get hover info for 'result1' (line 24)
{
  "name": "lsp_hover",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "line": 23,
    "character": 6
  }
}
```

### Workflow 4: Navigate to Definition

**User:** "Where is the `multiply` function defined in the TypeScript example?"

**Claude will:**
1. Open the document
2. Use `lsp_definition` to find the definition location

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Get definition of 'multiply' call (line 25)
{
  "name": "lsp_definition",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "line": 24,
    "character": 16
  }
}
```

### Workflow 5: Check for Errors

**User:** "Are there any errors or warnings in the TypeScript example file?"

**Claude will:**
1. Open the document
2. Use `lsp_diagnostics` to get all diagnostics

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Get diagnostics
{
  "name": "lsp_diagnostics",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}
```

### Workflow 6: Python Class Methods

**User:** "What methods are available on the Calculator class in the Python example?"

**Claude will:**
1. Open the Python file
2. Use `lsp_document_symbols` to get the class structure

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.py"
  }
}

// 2. Get document symbols (shows class structure)
{
  "name": "lsp_document_symbols",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.py"
  }
}
```

### Workflow 7: Rename Symbol

**User:** "Rename the `add` function to `addNumbers` in the TypeScript file."

**Claude will:**
1. Open the document
2. Use `lsp_rename` to get the workspace edit
3. Show you all the changes that would be made

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Rename 'add' function (line 8)
{
  "name": "lsp_rename",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "line": 8,
    "character": 9,
    "newName": "addNumbers"
  }
}
```

### Workflow 8: Format Document

**User:** "Format the TypeScript example file."

**Claude will:**
1. Open the document
2. Use `lsp_format_document` to get formatting edits

**Example tool calls:**
```json
// 1. Open document
{
  "name": "lsp_open_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts"
  }
}

// 2. Format the document
{
  "name": "lsp_format_document",
  "arguments": {
    "filePath": "/mcp-lsp-bridge/examples/example.ts",
    "tabSize": 2,
    "insertSpaces": true
  }
}
```

### Workflow 9: Search Workspace Symbols

**User:** "Find all functions and classes in my workspace that contain 'calc' in their name."

**Claude will:**
1. Use `lsp_workspace_symbols` with the query "calc"

**Example tool calls:**
```json
{
  "name": "lsp_workspace_symbols",
  "arguments": {
    "query": "calc"
  }
}
```

## Tips

### Line and Character Positions

- All positions are **zero-based**
- First line: `line: 0`
- First character: `character: 0`
- To get completions after a dot, position the cursor right after the dot

### Opening Documents

- Always open a document before performing operations on it
- Documents are cached, so opening the same document multiple times is fast
- Close documents when you're done to free resources

### Workspace Root

- Set `WORKSPACE_ROOT` environment variable to your project root
- This helps LSP servers understand your project structure
- Better results for features like "Find References" and "Go to Definition"

### Language Server Requirements

- Each language requires its LSP server to be installed
- Check README.md for installation instructions
- Some features may not be available in all language servers

### Error Handling

- If a tool returns an error, check:
  - Is the file path absolute?
  - Is the LSP server installed?
  - Is the document opened?
  - Are the line/character positions valid?

## Debugging

Set the `LOG_LEVEL` environment variable to see detailed logs:

```bash
export LOG_LEVEL=DEBUG
npm run dev
```

This will show:
- LSP server startup messages
- Request/response details
- Error messages with full stack traces
