# Production Deployment Checklist for qenex.ai

Use this checklist to ensure a smooth deployment of MCP-LSP Bridge to production.

## Pre-Deployment

### Server Requirements
- [ ] Ubuntu 20.04+ or Debian 11+ server
- [ ] At least 2GB RAM (4GB+ recommended)
- [ ] At least 10GB free disk space
- [ ] Root/sudo access
- [ ] SSH access configured

### Domain & DNS
- [ ] Domain `qenex.ai` registered
- [ ] DNS A record pointing to server IP
- [ ] DNS propagation complete (check with `dig qenex.ai`)
- [ ] Ports 80, 443, and 3000 accessible from internet

### Firewall Configuration
```bash
# Allow required ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # MCP Server (optional if using reverse proxy)
sudo ufw enable
```

## Installation Steps

### 1. System Updates
```bash
sudo apt-get update && sudo apt-get upgrade -y
```
- [ ] System updated

### 2. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify: v20.x
```
- [ ] Node.js 20+ installed
- [ ] npm installed

### 3. Install Build Tools
```bash
sudo apt-get install -y git build-essential curl
```
- [ ] Git installed
- [ ] Build tools installed

### 4. Clone and Setup Repository
```bash
cd /opt
sudo git clone <your-repo-url> mcp-lsp-bridge
cd mcp-lsp-bridge
sudo chown -R $USER:$USER .
```
- [ ] Repository cloned to `/opt/mcp-lsp-bridge`
- [ ] Permissions set correctly

### 5. Install Dependencies and Build
```bash
npm install
npm run build
```
- [ ] Dependencies installed
- [ ] TypeScript compilation successful
- [ ] `dist/` directory created

### 6. Configure Environment
```bash
cp .env.example .env
nano .env
```

Edit these values:
- [ ] `PORT=3000`
- [ ] `HOST=0.0.0.0`
- [ ] `WORKSPACE_ROOT=/workspace` (or your path)
- [ ] `ALLOWED_HOSTS=qenex.ai,www.qenex.ai,localhost`
- [ ] `LOG_LEVEL=INFO`

### 7. Create Workspace Directory
```bash
sudo mkdir -p /workspace
sudo chown -R www-data:www-data /workspace
```
- [ ] Workspace directory created
- [ ] Permissions set for www-data

### 8. Install Language Servers
```bash
sudo ./scripts/install-lsp-servers.sh
```
- [ ] TypeScript LSP installed
- [ ] Python LSP installed
- [ ] Other LSPs installed as needed
- [ ] All LSPs verified with `which` command

## Deployment

### 9. Deploy Service

Choose one:

#### Option A: Systemd Service
```bash
sudo ./scripts/deploy.sh system
```
- [ ] Service deployed
- [ ] Service started: `sudo systemctl status mcp-lsp-bridge`
- [ ] Service enabled for auto-start

#### Option B: Docker
```bash
# Edit docker-compose.yml with workspace path
sudo ./scripts/deploy.sh docker
```
- [ ] Docker image built
- [ ] Container started
- [ ] Container running: `docker ps`

### 10. Verify Service
```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected: {"status":"ok","activeSessions":0,"workspaceRoot":"..."}
```
- [ ] Service responding on port 3000
- [ ] Health endpoint returns OK

### 11. Setup Nginx Reverse Proxy
```bash
sudo ./scripts/setup-nginx.sh qenex.ai admin@qenex.ai
```
- [ ] Nginx installed
- [ ] Site configuration created
- [ ] Configuration enabled
- [ ] Nginx reloaded successfully

### 12. Test HTTP Access
```bash
curl http://qenex.ai/health
```
- [ ] Domain accessible via HTTP
- [ ] Health endpoint working through Nginx

### 13. Obtain SSL Certificate
```bash
sudo certbot --nginx -d qenex.ai
```
- [ ] SSL certificate obtained
- [ ] Certificate auto-renewal configured
- [ ] Certbot test successful: `sudo certbot renew --dry-run`

### 14. Enable HTTPS in Nginx
```bash
sudo nano /etc/nginx/sites-available/qenex.ai
# Uncomment HTTPS server block
# Comment out HTTP proxy location
# Enable redirect to HTTPS

sudo nginx -t
sudo systemctl reload nginx
```
- [ ] HTTPS server block uncommented
- [ ] HTTP redirects to HTTPS
- [ ] Nginx configuration valid
- [ ] Nginx reloaded

### 15. Final Verification
```bash
./scripts/verify-deployment.sh qenex.ai 3000 true
```
- [ ] All checks pass (green ✓)
- [ ] HTTPS accessible: `curl https://qenex.ai/health`
- [ ] SSL certificate valid

## Post-Deployment

### 16. Test MCP URL
```bash
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
- [ ] HTTPS health check successful
- [ ] Response shows correct workspace

### 17. Configure Claude
Add to Claude configuration:
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
- [ ] Configuration added to Claude Code
- [ ] Claude Code restarted
- [ ] Connection successful

### 18. Test MCP Functionality
Try these in Claude:
- [ ] "List available tools" - Should show LSP tools
- [ ] "Get TypeScript completions" - Test with a TS file
- [ ] "Find references" - Test code navigation
- [ ] "Format document" - Test formatting

### 19. Monitor and Logs
```bash
# View service logs
sudo journalctl -u mcp-lsp-bridge -f

# Or for Docker
docker logs -f mcp-lsp-bridge

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```
- [ ] Logs are accessible
- [ ] No errors in logs
- [ ] Requests appearing in logs

## Security Hardening (Recommended)

### 20. Additional Security
- [ ] Change SSH port from 22
- [ ] Disable root SSH login
- [ ] Setup fail2ban for SSH protection
- [ ] Configure log rotation
- [ ] Setup automated backups
- [ ] Add monitoring (e.g., uptime monitoring)
- [ ] Consider adding authentication middleware
- [ ] Setup rate limiting for API endpoints
- [ ] Regular security updates scheduled

## Maintenance

### 21. Update Procedures
Document these commands for future updates:
```bash
cd /opt/mcp-lsp-bridge
git pull
npm install
npm run build
sudo systemctl restart mcp-lsp-bridge
# Or: docker-compose down && docker-compose up -d --build
```
- [ ] Update procedure documented
- [ ] Backup procedure established

### 22. Monitoring Setup
- [ ] Setup uptime monitoring (e.g., UptimeRobot)
- [ ] Configure email alerts for downtime
- [ ] Monitor disk space
- [ ] Monitor memory usage
- [ ] Monitor SSL certificate expiry

## Troubleshooting Reference

### Common Issues
1. **Service won't start**: Check logs with `journalctl -u mcp-lsp-bridge -f`
2. **Nginx errors**: Test config with `sudo nginx -t`
3. **SSL issues**: Check with `sudo certbot certificates`
4. **Port conflicts**: Check with `sudo netstat -tulpn | grep :3000`
5. **Permission errors**: Verify workspace ownership `ls -la /workspace`

### Support Contacts
- [ ] Document your support contacts
- [ ] Save this checklist location
- [ ] Note any custom configurations

---

## Deployment Summary

**Deployment Date**: _________________

**Deployed By**: _________________

**Server IP**: _________________

**Domain**: qenex.ai

**MCP URL**: https://qenex.ai/mcp

**Workspace Path**: _________________

**Service Type**: [ ] Systemd  [ ] Docker

**SSL Certificate**: [ ] Let's Encrypt  [ ] Other: _________________

**Notes**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

**Status**:
- [ ] ✅ Fully deployed and tested
- [ ] ⚠️ Deployed with known issues (document above)
- [ ] ❌ Deployment incomplete

**Next Review Date**: _________________
