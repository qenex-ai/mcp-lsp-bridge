# Deployment Guide for MCP-LSP Bridge

This guide explains how to deploy the MCP-LSP Bridge HTTP server for remote access via URL.

## Quick Start - Your MCP URL

After deploying to your domain, your MCP URL will be:

```
https://qenex.ai/mcp
```

Or for HTTP (development only):
```
http://qenex.ai:3000/mcp
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Create Dockerfile** (saved as `Dockerfile` in project root):

```dockerfile
FROM node:20-slim

# Install language servers
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    clangd \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js language servers
RUN npm install -g typescript typescript-language-server \
    yaml-language-server \
    bash-language-server \
    vscode-langservers-extracted

# Install Python language server
RUN pip3 install 'python-lsp-server[all]' --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV WORKSPACE_ROOT=/workspace

# Create workspace directory
RUN mkdir -p /workspace

CMD ["node", "dist/http-server.js"]
```

2. **Build and run**:

```bash
# Build the TypeScript code
npm run build

# Build Docker image
docker build -t mcp-lsp-bridge .

# Run container
docker run -d \
  -p 3000:3000 \
  -v /path/to/your/workspace:/workspace \
  -e ALLOWED_HOSTS=qenex.ai \
  --name mcp-lsp-bridge \
  mcp-lsp-bridge
```

### Option 2: Direct Deployment on Linux Server

1. **Install dependencies**:

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install language servers
sudo npm install -g typescript typescript-language-server \
    yaml-language-server \
    bash-language-server \
    vscode-langservers-extracted

# Install Python language server
pip install 'python-lsp-server[all]'
```

2. **Build and install the service**:

```bash
# Clone/copy the project to server
cd /opt/mcp-lsp-bridge

# Install dependencies and build
npm install
npm run build

# Create .env file
cp .env.example .env
nano .env  # Edit configuration
```

3. **Create systemd service** (save as `/etc/systemd/system/mcp-lsp-bridge.service`):

```ini
[Unit]
Description=MCP-LSP Bridge HTTP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mcp-lsp-bridge
EnvironmentFile=/opt/mcp-lsp-bridge/.env
ExecStart=/usr/bin/node /opt/mcp-lsp-bridge/dist/http-server.js
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/path/to/workspace

[Install]
WantedBy=multi-user.target
```

4. **Start the service**:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mcp-lsp-bridge
sudo systemctl start mcp-lsp-bridge
sudo systemctl status mcp-lsp-bridge
```

### Option 3: Reverse Proxy with Nginx (Production)

For production deployment with HTTPS, use Nginx as a reverse proxy:

1. **Install Nginx**:

```bash
sudo apt-get install nginx certbot python3-certbot-nginx
```

2. **Create Nginx configuration** (save as `/etc/nginx/sites-available/qenex.ai`):

```nginx
upstream mcp-lsp-bridge {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name qenex.ai;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name qenex.ai;

    ssl_certificate /etc/letsencrypt/live/qenex.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qenex.ai/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # MCP endpoint
    location /mcp {
        proxy_pass http://mcp-lsp-bridge;
        proxy_http_version 1.1;

        # WebSocket and SSE support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running requests
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://mcp-lsp-bridge;
        proxy_set_header Host $host;
    }
}
```

3. **Enable site and get SSL certificate**:

```bash
sudo ln -s /etc/nginx/sites-available/qenex.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d qenex.ai
sudo systemctl restart nginx
```

## Using Your MCP URL

### In Claude Code

Add to your Claude Code configuration (`~/.claude/config.json`):

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

### In Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lsp-bridge-remote": {
      "url": "https://qenex.ai/mcp"
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to listen on | `3000` |
| `HOST` | Host to bind to | `0.0.0.0` |
| `WORKSPACE_ROOT` | Root directory for LSP operations | Current directory |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hosts | None (all allowed) |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARN, ERROR) | `INFO` |

## Security Considerations

1. **Use HTTPS in production** - Always use a reverse proxy with SSL/TLS
2. **Authentication** - Consider adding authentication middleware for production
3. **Firewall** - Restrict access to known IP addresses if possible
4. **DNS Rebinding Protection** - Set `ALLOWED_HOSTS` to your domain
5. **Rate Limiting** - The server includes rate limiting by default
6. **Workspace Isolation** - Use separate workspaces for different users/projects

## Monitoring

### Check server status:
```bash
curl https://qenex.ai/health
```

### View logs (systemd):
```bash
sudo journalctl -u mcp-lsp-bridge -f
```

### View logs (Docker):
```bash
docker logs -f mcp-lsp-bridge
```

## Troubleshooting

### Connection issues
- Verify the server is running: `systemctl status mcp-lsp-bridge`
- Check firewall rules: `sudo ufw status`
- Test endpoint: `curl https://qenex.ai/health`

### Language server errors
- Ensure language servers are installed
- Check workspace permissions
- Verify `WORKSPACE_ROOT` environment variable

### SSL certificate issues
- Renew certificates: `sudo certbot renew`
- Check Nginx configuration: `sudo nginx -t`

## Updating

```bash
# Pull latest code
cd /opt/mcp-lsp-bridge
git pull

# Rebuild
npm install
npm run build

# Restart service
sudo systemctl restart mcp-lsp-bridge
```

## Support

For issues and questions, please visit:
https://github.com/modelcontextprotocol/typescript-sdk
