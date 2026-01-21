# MCP-LSP Bridge

A Model Context Protocol (MCP) server that bridges to multiple Language Server Protocol (LSP) servers, providing AI-powered code intelligence through Claude and other AI assistants.

**Live Production Server**: `https://qenex.ai/mcp`

## Features

- **10+ Language Servers**: TypeScript, Python, Go, Rust, C/C++, Ruby, PHP, YAML, Bash, HTML/CSS/JSON
- **Code Intelligence**: Completions, hover info, go-to-definition, find references, diagnostics
- **Refactoring**: Rename symbols, format documents, code actions (quick fixes)
- **HTTP & STDIO Transport**: Run locally or deploy as a remote service
- **Session Management**: Resumable sessions with Server-Sent Events (SSE)
- **Production Ready**: Includes Docker, systemd, and automated deployment scripts

## Quick Start

### 1. Install

```bash
git clone https://github.com/qenex-ai/mcp-lsp-bridge.git
cd mcp-lsp-bridge
npm install
npm run build
```

### 2. Configure Claude

#### Option A: Use Public Server (Fastest)

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "url": "https://qenex.ai/mcp",
      "transport": "streamableHttp"
    }
  }
}
```

#### Option B: Run Locally (STDIO)

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "command": "node",
      "args": ["/path/to/mcp-lsp-bridge/dist/index.js"],
      "env": {
        "WORKSPACE_ROOT": "/path/to/your/workspace"
      }
    }
  }
}
```

#### Option C: Deploy Your Own Server

```bash
# Quick deployment (automated)
./commit-and-prepare.sh
./DEPLOY_NOW.sh

# Or manual deployment
npm run dev:http  # Development
npm run start:http  # Production
```

### 3. Install Language Servers

```bash
# Automated installation (Linux/macOS)
sudo ./scripts/install-lsp-servers.sh

# Or install manually:
npm install -g typescript typescript-language-server  # TypeScript
pip install 'python-lsp-server[all]'  # Python
sudo apt install clangd  # C/C++
npm install -g yaml-language-server bash-language-server  # YAML, Bash
npm install -g vscode-langservers-extracted  # HTML/CSS/JSON
```

## Production Deployment

### Automated Deployment (Recommended)

Deploy to your own server with one command:

```bash
./DEPLOY_NOW.sh
```

This will:
- Install dependencies (Node.js, Nginx, Certbot)
- Build and deploy the service
- Configure reverse proxy with SSL
- Install language servers
- Set up systemd for auto-restart

### Manual Deployment

```bash
# 1. Build
npm install
npm run build

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Install language servers
sudo ./scripts/install-lsp-servers.sh

# 4. Deploy service (systemd)
sudo ./scripts/deploy.sh system

# 5. Configure Nginx + SSL
sudo ./scripts/setup-nginx.sh yourdomain.com admin@yourdomain.com
sudo certbot --nginx -d yourdomain.com

# 6. Verify
./scripts/verify-deployment.sh yourdomain.com 3000 true
```

### Docker Deployment

```bash
# Using docker-compose
docker-compose up -d

# Or build and run manually
docker build -t mcp-lsp-bridge .
docker run -d -p 3000:3000 \
  -v /workspace:/workspace \
  -e WORKSPACE_ROOT=/workspace \
  mcp-lsp-bridge
```

### Environment Variables

Create `.env` file:

```bash
PORT=3000
HOST=0.0.0.0
WORKSPACE_ROOT=/workspace
ALLOWED_HOSTS=yourdomain.com,localhost
LOG_LEVEL=INFO
```

## Available MCP Tools

### Document Lifecycle

- `lsp_open_document` - Open a document (required before other operations)
- `lsp_close_document` - Close a document

### Code Intelligence

- `lsp_completion` - Get code completions
- `lsp_hover` - Get hover information (types, docs)
- `lsp_definition` - Go to definition
- `lsp_references` - Find all references
- `lsp_diagnostics` - Get errors and warnings

### Refactoring

- `lsp_rename` - Rename symbol across workspace
- `lsp_format_document` - Format code
- `lsp_code_action` - Get quick fixes and refactorings

### Navigation

- `lsp_workspace_symbols` - Search symbols across workspace
- `lsp_document_symbols` - Get document outline

## Usage Examples

### Get TypeScript Completions

```javascript
// 1. Open document
lsp_open_document({ "filePath": "/workspace/src/app.ts" })

// 2. Get completions at line 10, character 5
lsp_completion({
  "filePath": "/workspace/src/app.ts",
  "line": 10,
  "character": 5
})
```

### Find All References

```python
# Find where 'handleClick' is used
lsp_open_document({ "filePath": "/workspace/src/utils.py" })
lsp_references({
  "filePath": "/workspace/src/utils.py",
  "line": 25,
  "character": 10
})
```

### Rename Variable

```go
// Rename 'oldName' to 'newName' everywhere
lsp_open_document({ "filePath": "/workspace/main.go" })
lsp_rename({
  "filePath": "/workspace/main.go",
  "line": 15,
  "character": 8,
  "newName": "newName"
})
```

## Supported Languages

| Language | LSP Server | Installation |
|----------|-----------|--------------|
| TypeScript/JavaScript | typescript-language-server | `npm install -g typescript-language-server` |
| Python | pylsp | `pip install 'python-lsp-server[all]'` |
| Go | gopls | `go install golang.org/x/tools/gopls@latest` |
| Rust | rust-analyzer | `rustup component add rust-analyzer` |
| C/C++ | clangd | `sudo apt install clangd` |
| Ruby | solargraph | `gem install solargraph` |
| PHP | intelephense | `npm install -g intelephense` |
| YAML | yaml-language-server | `npm install -g yaml-language-server` |
| Bash | bash-language-server | `npm install -g bash-language-server` |
| HTML/CSS/JSON | vscode-langservers | `npm install -g vscode-langservers-extracted` |

## Architecture

```
Claude → MCP Protocol → HTTP/STDIO Transport → MCP-LSP Bridge → LSP Clients → Language Servers
```

### Key Components

- **HTTP Server** (`http-server-simple.ts`): StreamableHTTP transport with SSE
- **STDIO Server** (`index.ts`): Standard input/output transport
- **Client Manager**: Manages LSP client lifecycle
- **Protocol Translator**: Converts MCP tools to LSP requests
- **Session Store**: In-memory event storage for resumability

## Service Management

### Systemd (Linux)

```bash
# Start/stop/restart
sudo systemctl start mcp-lsp-bridge
sudo systemctl stop mcp-lsp-bridge
sudo systemctl restart mcp-lsp-bridge

# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Enable auto-start on boot
sudo systemctl enable mcp-lsp-bridge
```

### Health Monitoring

```bash
# Local health check
curl http://localhost:3000/health

# Public health check
curl https://qenex.ai/mcp -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'
```

## Security

Production deployment includes:

- ✅ HTTPS/TLS encryption (Let's Encrypt)
- ✅ DNS rebinding protection
- ✅ Web Application Firewall (WAF) rules
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Systemd security hardening
- ✅ Non-root execution (www-data user)

## Troubleshooting

### LSP Server Not Found

```bash
# Verify language server is installed
which typescript-language-server
which pylsp
which gopls

# Add to PATH if needed
export PATH=$PATH:/usr/local/bin:$HOME/go/bin
```

### Document Must Be Opened First

Always call `lsp_open_document` before other operations:

```javascript
lsp_open_document({ "filePath": "/workspace/file.ts" })
lsp_completion({ "filePath": "/workspace/file.ts", ... })
```

### Connection Timeout

For remote servers, ensure:
- Port 3000 (or configured port) is open
- Firewall allows HTTPS (443)
- DNS is properly configured
- SSL certificate is valid

### Service Won't Start

```bash
# Check logs
sudo journalctl -u mcp-lsp-bridge -n 50

# Verify workspace exists
ls -la /workspace

# Check port availability
sudo lsof -i :3000
```

## Development

### Run in Development Mode

```bash
# STDIO mode
npm run dev

# HTTP mode
npm run dev:http
```

### Build

```bash
npm run build
```

### Test

```bash
# Test local server
./scripts/test-server.sh

# Test deployed server
./scripts/verify-deployment.sh yourdomain.com 3000 true
```

## Project Structure

```
mcp-lsp-bridge/
├── src/
│   ├── index.ts              # STDIO entry point
│   ├── http-server-simple.ts # HTTP server
│   ├── server.ts             # Core MCP server
│   ├── client-manager.ts     # LSP client lifecycle
│   ├── protocol-translator.ts # MCP ↔ LSP conversion
│   └── config/               # LSP server configurations
├── scripts/
│   ├── deploy.sh             # Deployment automation
│   ├── install-lsp-servers.sh # Install language servers
│   ├── setup-nginx.sh        # Nginx + SSL setup
│   └── verify-deployment.sh  # Health checks
├── docker-compose.yml        # Docker orchestration
├── Dockerfile                # Container image
└── mcp-lsp-bridge.service    # Systemd service
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- **Repository**: https://github.com/qenex-ai/mcp-lsp-bridge
- **Live Server**: https://qenex.ai/mcp
- **MCP Documentation**: https://modelcontextprotocol.io
- **LSP Specification**: https://microsoft.github.io/language-server-protocol

## Support

- **Issues**: https://github.com/qenex-ai/mcp-lsp-bridge/issues
- **Discussions**: https://github.com/qenex-ai/mcp-lsp-bridge/discussions

---

Built with ❤️ using [Model Context Protocol](https://modelcontextprotocol.io) and [Language Server Protocol](https://microsoft.github.io/language-server-protocol)
