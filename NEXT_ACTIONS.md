# 🚀 NEXT ACTIONS - Deploy to Production

Your MCP-LSP Bridge is ready! Here's exactly what to do next.

## Option 1: Automated Deployment (Recommended) ⚡

### Step 1: Push to Git Repository

```bash
# Initialize git (if not already)
cd /mcp-lsp-bridge
git init

# Add all files
git add .

# Commit
git commit -m "MCP-LSP Bridge ready for qenex.ai deployment"

# Add your remote (GitHub, GitLab, etc.)
git remote add origin <your-repo-url>

# Push
git push -u origin main
```

### Step 2: Run Automated Deployment

```bash
# Run the deployment script
./DEPLOY_NOW.sh
```

**The script will:**
- ✅ Test SSH connection to qenex.ai
- ✅ Clone repository to server
- ✅ Install dependencies
- ✅ Build the project
- ✅ Install language servers
- ✅ Deploy systemd service
- ✅ Setup Nginx
- ⚠️ Prompt you to run certbot for SSL

**Time:** 15 minutes

---

## Option 2: Manual Deployment (Step-by-Step) 📋

### Step 1: Get Your Code on GitHub

```bash
cd /mcp-lsp-bridge

# Create repository on GitHub, then:
git init
git add .
git commit -m "MCP-LSP Bridge for qenex.ai"
git remote add origin https://github.com/yourusername/mcp-lsp-bridge.git
git push -u origin main
```

### Step 2: SSH to Your Server

```bash
ssh user@qenex.ai
```

### Step 3: Deploy

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx certbot python3-certbot-nginx

# Clone your repository
cd /opt
sudo git clone https://github.com/yourusername/mcp-lsp-bridge.git
cd mcp-lsp-bridge

# Build
npm install && npm run build

# Install language servers
sudo ./scripts/install-lsp-servers.sh

# Deploy service
sudo ./scripts/deploy.sh system

# Setup Nginx
sudo ./scripts/setup-nginx.sh qenex.ai admin@qenex.ai

# Get SSL certificate
sudo certbot --nginx -d qenex.ai

# Enable HTTPS in Nginx
sudo nano /etc/nginx/sites-available/qenex.ai
# Uncomment HTTPS server block
sudo systemctl reload nginx

# Verify
./scripts/verify-deployment.sh qenex.ai 3000 true
```

---

## Option 3: Docker Deployment 🐳

### Step 1: Push Code to Git (same as above)

### Step 2: Deploy with Docker

```bash
ssh user@qenex.ai

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
cd /opt
sudo git clone https://github.com/yourusername/mcp-lsp-bridge.git
cd mcp-lsp-bridge

# Update docker-compose.yml with your workspace path
sudo nano docker-compose.yml

# Deploy
sudo ./scripts/deploy.sh docker

# Setup Nginx + SSL
sudo ./scripts/setup-nginx.sh qenex.ai admin@qenex.ai
sudo certbot --nginx -d qenex.ai
```

---

## What You Need Before Deploying

### ✅ Checklist

- [ ] qenex.ai domain pointing to your server IP
- [ ] SSH access to server (username and IP/domain)
- [ ] Ports 80, 443 open in firewall
- [ ] Git repository URL (GitHub, GitLab, etc.)
- [ ] Email address for SSL certificate

### Quick Server Setup

```bash
# On your server (qenex.ai)
# Check DNS is pointing correctly
dig qenex.ai +short

# Open firewall ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## After Deployment

### 1. Verify It's Working

```bash
curl https://qenex.ai/health
# Should return: {"status":"ok",...}
```

### 2. Configure Claude

Add to `~/.claude/config.json`:

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

### 3. Test in Claude

```
"List available MCP tools"
"Get TypeScript completions for my code"
"Find all references to this function"
```

### 4. Monitor

```bash
# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Check status
sudo systemctl status mcp-lsp-bridge

# Health check
curl https://qenex.ai/health
```

---

## Troubleshooting

### Can't SSH to Server
```bash
# Test connection
ssh -v user@qenex.ai

# Check SSH is running
ssh user@qenex.ai "sudo systemctl status ssh"
```

### DNS Not Pointing to Server
```bash
# Check DNS
dig qenex.ai +short

# Update DNS A record in your domain registrar
# Wait 5-10 minutes for propagation
```

### SSL Certificate Failed
```bash
# Ensure DNS is correct
dig qenex.ai +short

# Ensure port 80 is open
sudo ufw status

# Try again
sudo certbot --nginx -d qenex.ai
```

### Service Won't Start
```bash
# Check logs
sudo journalctl -u mcp-lsp-bridge -n 50

# Check environment
cat /opt/mcp-lsp-bridge/.env

# Restart service
sudo systemctl restart mcp-lsp-bridge
```

---

## Quick Reference

### Essential Commands

```bash
# Push code
git add . && git commit -m "update" && git push

# SSH to server
ssh user@qenex.ai

# View logs
sudo journalctl -u mcp-lsp-bridge -f

# Restart service
sudo systemctl restart mcp-lsp-bridge

# Check status
curl https://qenex.ai/health

# Verify deployment
cd /opt/mcp-lsp-bridge && ./scripts/verify-deployment.sh qenex.ai 3000 true
```

### Update Deployment

```bash
# On server
cd /opt/mcp-lsp-bridge
git pull
npm install
npm run build
sudo systemctl restart mcp-lsp-bridge
```

---

## Support Files

- **DEPLOY_NOW.sh** - Automated deployment script (run this!)
- **DEPLOY_TO_PRODUCTION.md** - Detailed manual guide
- **DEPLOYMENT_CHECKLIST.md** - Interactive checklist
- **QUICK_START.md** - 15-minute guide

---

## Your URLs

```
Local:      http://127.0.0.1:8080/mcp (LIVE NOW)
Production: https://qenex.ai/mcp (DEPLOY IT!)
```

---

## Choose Your Path

### 🚀 Fastest: Run `./DEPLOY_NOW.sh`
- Automated deployment
- 15 minutes
- Minimal manual steps

### 📋 Safest: Follow `DEPLOY_TO_PRODUCTION.md`
- Step-by-step instructions
- Full explanations
- Complete control

### ☑️ Guided: Use `DEPLOYMENT_CHECKLIST.md`
- Interactive checklist
- Track your progress
- Nothing forgotten

---

## Ready to Deploy?

1. **Push code to git** (see Step 1 above)
2. **Run `./DEPLOY_NOW.sh`** or follow manual steps
3. **Get SSL certificate** with certbot
4. **Configure Claude** with your MCP URL
5. **Test and enjoy!** 🎉

Your MCP-LSP Bridge is waiting to go LIVE! 🚀
