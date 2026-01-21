# 🚀 Deploy MCP-LSP Bridge to qenex.ai - LIVE NOW

## ✅ Local Server is LIVE

Your MCP-LSP Bridge is currently running locally and verified working:
- **Health Check**: http://127.0.0.1:8080/health ✓
- **MCP Endpoint**: http://127.0.0.1:8080/mcp ✓
- **Status**: Active and responding ✓

## Deploy to Production (qenex.ai)

### Prerequisites
1. SSH access to your qenex.ai server
2. Domain qenex.ai pointing to your server IP
3. Ports 80, 443 open in firewall

### Step 1: Copy Files to Server

From your local machine:
```bash
# Option A: Using rsync
rsync -avz /mcp-lsp-bridge/ user@qenex.ai:/opt/mcp-lsp-bridge/

# Option B: Using git (recommended)
# On server:
ssh user@qenex.ai
cd /opt
sudo git clone https://github.com/your-repo/mcp-lsp-bridge.git
cd mcp-lsp-bridge
```

### Step 2: Install Dependencies on Server

```bash
# On qenex.ai server
ssh user@qenex.ai

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y git build-essential nginx certbot python3-certbot-nginx

# Navigate to project
cd /opt/mcp-lsp-bridge

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Install Language Servers

```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge
sudo ./scripts/install-lsp-servers.sh
```

### Step 4: Configure Environment

```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge

# Update .env file
nano .env
```

Ensure these settings:
```env
PORT=3000
HOST=0.0.0.0
WORKSPACE_ROOT=/workspace
ALLOWED_HOSTS=qenex.ai,www.qenex.ai,localhost
LOG_LEVEL=INFO
```

### Step 5: Deploy as Systemd Service

```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge
sudo ./scripts/deploy.sh system
```

This will:
- Copy files to `/opt/mcp-lsp-bridge`
- Install production dependencies
- Create systemd service
- Start the service
- Enable auto-start on boot

### Step 6: Setup Nginx + SSL

```bash
# On qenex.ai server
sudo ./scripts/setup-nginx.sh qenex.ai admin@qenex.ai
```

### Step 7: Get SSL Certificate

```bash
# On qenex.ai server
sudo certbot --nginx -d qenex.ai
```

Follow the prompts to:
- Enter your email
- Agree to terms
- Choose redirect option (recommended)

### Step 8: Enable HTTPS in Nginx

```bash
# On qenex.ai server
sudo nano /etc/nginx/sites-available/qenex.ai
```

Find the commented HTTPS server block and uncomment it:
```nginx
# Remove the # from these lines:
server {
    listen 443 ssl http2;
    server_name qenex.ai;

    ssl_certificate /etc/letsencrypt/live/qenex.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qenex.ai/privkey.pem;
    ...
}
```

Then reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Verify Deployment

```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge
./scripts/verify-deployment.sh qenex.ai 3000 true
```

Should show all green checkmarks ✓

### Step 10: Test Your MCP URL

```bash
# From anywhere
curl https://qenex.ai/health
```

Expected response:
```json
{
  "status": "ok",
  "activeSessions": 0,
  "workspaceRoot": "/workspace"
}
```

## Configure Claude

### For Claude Code

Edit `~/.claude/config.json`:
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

### For Claude Desktop

Add to configuration:
```json
{
  "mcpServers": {
    "lsp-bridge": {
      "url": "https://qenex.ai/mcp"
    }
  }
}
```

## Test in Claude

Once configured, try these commands:
- "List available MCP tools"
- "Get TypeScript completions for my code"
- "Find all references to this function"
- "Show hover info for this variable"

## Management Commands

### On qenex.ai Server:

```bash
# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Check status
sudo systemctl status mcp-lsp-bridge

# Restart service
sudo systemctl restart mcp-lsp-bridge

# Stop service
sudo systemctl stop mcp-lsp-bridge

# Start service
sudo systemctl start mcp-lsp-bridge

# Health check
curl http://localhost:3000/health
curl https://qenex.ai/health
```

## Update Procedure

When you need to update:
```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge
git pull
npm install
npm run build
sudo systemctl restart mcp-lsp-bridge
```

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u mcp-lsp-bridge -n 50
cat /opt/mcp-lsp-bridge/.env
```

### Nginx errors
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Can't connect
```bash
# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check DNS
dig qenex.ai +short
```

## Alternative: Docker Deployment

If you prefer Docker:

```bash
# On qenex.ai server
cd /opt/mcp-lsp-bridge

# Update docker-compose.yml with workspace path
nano docker-compose.yml

# Deploy
sudo ./scripts/deploy.sh docker

# Setup Nginx + SSL
sudo ./scripts/setup-nginx.sh qenex.ai
sudo certbot --nginx -d qenex.ai
```

## Monitoring Setup (Optional)

### Add Uptime Monitoring
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Monitor: https://qenex.ai/health

### View Metrics
```bash
# Active sessions
curl -s https://qenex.ai/health | jq '.activeSessions'

# Service status
sudo systemctl status mcp-lsp-bridge
```

## Security Checklist

- [x] SSL/TLS enabled (HTTPS)
- [x] Firewall configured
- [x] DNS rebinding protection (ALLOWED_HOSTS)
- [x] Rate limiting (built-in)
- [x] Non-root user execution
- [ ] Setup fail2ban (optional)
- [ ] Add authentication middleware (optional)
- [ ] Configure log rotation (optional)

## Your Production URL

```
https://qenex.ai/mcp
```

This is your live MCP endpoint accessible from anywhere!

## Success Criteria

✅ Server running on qenex.ai
✅ HTTPS working with valid certificate
✅ Health endpoint responding
✅ MCP endpoint accessible
✅ Configured in Claude
✅ LSP tools working in Claude

## Next Steps After Deployment

1. Test all LSP features in Claude
2. Set up monitoring and alerts
3. Configure automated backups
4. Review security settings
5. Add custom language servers if needed
6. Configure log rotation
7. Set up CI/CD for updates (optional)

## Support

- Logs: `sudo journalctl -u mcp-lsp-bridge -f`
- Health: `curl https://qenex.ai/health`
- Verify: `./scripts/verify-deployment.sh qenex.ai 3000 true`
- Docs: See `DEPLOYMENT.md` for detailed guide

---

**Your MCP-LSP Bridge is ready to go LIVE on qenex.ai!** 🚀

Follow the steps above to deploy to production.
