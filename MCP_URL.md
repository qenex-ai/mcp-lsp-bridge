# MCP-LSP Bridge URL for qenex.ai

## Your Ready MCP URL

```
https://qenex.ai/mcp
```

For development/testing (HTTP):
```
http://qenex.ai:3000/mcp
```

## Quick Start

### 1. Deploy the Server

Choose one of the deployment methods:

**Docker (Recommended):**
```bash
docker-compose up -d
```

**Manual:**
```bash
npm run build
npm run start:http
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### 2. Configure Your Client

**Claude Code Configuration** (`~/.claude/config.json`):
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

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "lsp-bridge": {
      "url": "https://qenex.ai/mcp"
    }
  }
}
```

## URL Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP JSON-RPC requests |
| `/mcp` | GET | Server-Sent Events (SSE) stream |
| `/mcp` | DELETE | Session termination |
| `/health` | GET | Health check |

## Features

- **Remote Access**: Connect from anywhere to your LSP servers
- **Multi-Language Support**: TypeScript, Python, Go, Rust, and more
- **Session Management**: Automatic session handling and resumability
- **Real-time Updates**: SSE support for server-initiated notifications
- **Health Monitoring**: Built-in health check endpoint

## Example Usage

### Connect from Claude

Once deployed, simply add the server configuration to Claude and start using LSP tools:

```
User: "Get code completions for my TypeScript file"
Claude: Uses lsp_completion tool with your remote server
```

### Test the Connection

```bash
# Check if server is running
curl https://qenex.ai/health

# Expected response:
# {"status":"ok","activeSessions":0,"workspaceRoot":"/workspace"}
```

## Security Notes

1. **Use HTTPS in Production**: Always use SSL/TLS encryption
2. **Set ALLOWED_HOSTS**: Restrict to your domain in production
3. **Rate Limiting**: Built-in rate limiting protects against abuse
4. **Authentication**: Consider adding auth middleware for production use

## Environment Configuration

Create a `.env` file:

```env
PORT=3000
HOST=0.0.0.0
WORKSPACE_ROOT=/path/to/your/workspace
ALLOWED_HOSTS=qenex.ai
LOG_LEVEL=INFO
```

## Troubleshooting

**Connection Refused:**
- Verify server is running: `systemctl status mcp-lsp-bridge`
- Check firewall: `sudo ufw status`

**SSL Certificate Issues:**
- Use Let's Encrypt: `sudo certbot --nginx -d qenex.ai`

**Language Server Not Found:**
- Install required LSP servers (see README.md)

## Next Steps

1. Deploy using [DEPLOYMENT.md](./DEPLOYMENT.md) instructions
2. Configure SSL with Let's Encrypt
3. Set up Nginx reverse proxy
4. Add your MCP URL to Claude
5. Start using language intelligence features!

## Support

- GitHub: https://github.com/modelcontextprotocol/typescript-sdk
- Documentation: See [README.md](./README.md) and [DEPLOYMENT.md](./DEPLOYMENT.md)
