# Quick Start Guide - MCP-LSP Bridge on qenex.ai

This guide will get your MCP-LSP Bridge deployed and accessible at `https://qenex.ai/mcp` in minutes.

## Prerequisites

- A server with Ubuntu/Debian (20.04+ or 11+)
- Domain `qenex.ai` pointing to your server's IP
- Root/sudo access
- Ports 80, 443, and 3000 open

## Step 1: Install Dependencies (5 minutes)

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y git build-essential

# Verify installation
node --version  # Should show v20.x
npm --version   # Should show v10.x
```

## Step 2: Clone and Build (2 minutes)

```bash
# Clone to /opt (or your preferred location)
cd /opt
sudo git clone <your-repo-url> mcp-lsp-bridge
cd mcp-lsp-bridge

# Install dependencies and build
npm install
npm run build

# Configure environment
cp .env.example .env
nano .env  # Update WORKSPACE_ROOT if needed
```

## Step 3: Install Language Servers (3 minutes)

```bash
# Run the automated installer
sudo ./scripts/install-lsp-servers.sh
```

This installs:
- TypeScript/JavaScript LSP
- Python LSP
- YAML, Bash, HTML/CSS/JSON LSPs
- Optional: Go, Rust, C/C++, Ruby, PHP LSPs

## Step 4: Deploy the Service (2 minutes)

### Option A: Systemd (Recommended for production)

```bash
# Deploy as systemd service
sudo ./scripts/deploy.sh system
```

### Option B: Docker

```bash
# Update docker-compose.yml with your workspace path
sudo ./scripts/deploy.sh docker
```

## Step 5: Setup Nginx + SSL (5 minutes)

```bash
# Install and configure Nginx
sudo ./scripts/setup-nginx.sh qenex.ai admin@qenex.ai

# Obtain SSL certificate (follow prompts)
sudo certbot --nginx -d qenex.ai
```

After obtaining the certificate:

```bash
# Edit Nginx config to enable HTTPS
sudo nano /etc/nginx/sites-available/qenex.ai

# Uncomment the HTTPS server block (lines starting with #)
# Comment out the HTTP proxy location

# Reload Nginx
sudo systemctl reload nginx
```

## Step 6: Verify Deployment (1 minute)

```bash
# Run verification script
./scripts/verify-deployment.sh qenex.ai 3000 true

# Should show all green checkmarks ✓

# Test the health endpoint
curl https://qenex.ai/health

# Expected output:
# {"status":"ok","activeSessions":0,"workspaceRoot":"/workspace"}
```

## Step 7: Configure Claude

Add to your Claude Code configuration (`~/.claude/config.json`):

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

Or for Claude Desktop:

```json
{
  "mcpServers": {
    "lsp-bridge": {
      "url": "https://qenex.ai/mcp"
    }
  }
}
```

## 🎉 Done!

Your MCP-LSP Bridge is now live at: **https://qenex.ai/mcp**

## Testing

Try these commands in Claude:

```
"Get TypeScript completions for my file at line 10"
"Find all references to this function"
"Show me the hover info for this variable"
"Rename this symbol across the workspace"
```

## Troubleshooting

### Service not starting

```bash
# Check service status
sudo systemctl status mcp-lsp-bridge

# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Check configuration
cat /opt/mcp-lsp-bridge/.env
```

### Nginx errors

```bash
# Test Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Connection refused

```bash
# Check firewall
sudo ufw status

# Open required ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
```

## Useful Commands

```bash
# Service management
sudo systemctl start mcp-lsp-bridge
sudo systemctl stop mcp-lsp-bridge
sudo systemctl restart mcp-lsp-bridge
sudo systemctl status mcp-lsp-bridge

# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Health check
curl https://qenex.ai/health

# Update deployment
cd /opt/mcp-lsp-bridge
git pull
npm install
npm run build
sudo systemctl restart mcp-lsp-bridge
```

## Next Steps

- Set up monitoring (Prometheus, Grafana)
- Configure automated backups
- Add authentication middleware
- Set up rate limiting for production
- Configure log rotation

## Support

- Documentation: See [README.md](./README.md) and [DEPLOYMENT.md](./DEPLOYMENT.md)
- Scripts: Check `./scripts/` directory
- Issues: GitHub repository
