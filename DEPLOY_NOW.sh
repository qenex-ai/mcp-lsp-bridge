#!/bin/bash
# DEPLOY NOW - Production Deployment Script for qenex.ai
# Run this script on your LOCAL machine to deploy to your qenex.ai server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}║          MCP-LSP Bridge - Production Deployment                  ║${NC}"
echo -e "${BLUE}║          Deploy to: qenex.ai                                     ║${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get server details
read -p "SSH User (e.g., ubuntu, root): " SSH_USER
read -p "Server IP/Domain (default: qenex.ai): " SERVER
SERVER=${SERVER:-qenex.ai}

echo ""
echo -e "${YELLOW}Deploying to: ${SSH_USER}@${SERVER}${NC}"
echo ""
read -p "Continue? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${GREEN}Step 1: Testing SSH Connection...${NC}"
if ssh -o ConnectTimeout=5 ${SSH_USER}@${SERVER} "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✓ SSH connection successful${NC}"
else
    echo -e "${RED}✗ Cannot connect to ${SSH_USER}@${SERVER}${NC}"
    echo "Please check your SSH credentials and try again."
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Checking if git repository exists...${NC}"
if [ -d .git ]; then
    echo -e "${GREEN}✓ Git repository found${NC}"
    REPO_URL=$(git config --get remote.origin.url || echo "")
    if [ -z "$REPO_URL" ]; then
        echo -e "${YELLOW}⚠ No remote origin found. You'll need to push to a git repository first.${NC}"
        echo ""
        echo "Quick setup:"
        echo "  1. Create a repository on GitHub/GitLab"
        echo "  2. git remote add origin <your-repo-url>"
        echo "  3. git add ."
        echo "  4. git commit -m 'MCP-LSP Bridge ready for deployment'"
        echo "  5. git push -u origin main"
        echo ""
        read -p "Enter your git repository URL (or press Enter to skip): " MANUAL_REPO_URL
        REPO_URL=${MANUAL_REPO_URL}
    else
        echo -e "${GREEN}✓ Repository URL: ${REPO_URL}${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Not a git repository. Initializing...${NC}"
    git init
    git add .
    git commit -m "Initial commit: MCP-LSP Bridge for qenex.ai"
    echo ""
    echo "Please push this to a git repository:"
    echo "  git remote add origin <your-repo-url>"
    echo "  git push -u origin main"
    echo ""
    read -p "Enter your git repository URL: " REPO_URL
fi

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}✗ Git repository URL required for deployment${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 3: Deploying to ${SERVER}...${NC}"

# Create deployment script
cat > /tmp/deploy_mcp_remote.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

REPO_URL="$1"
DOMAIN="$2"
EMAIL="$3"

echo "Installing prerequisites..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
sudo apt-get update
sudo apt-get install -y nodejs git build-essential nginx certbot python3-certbot-nginx

echo "Cloning repository..."
sudo rm -rf /opt/mcp-lsp-bridge
cd /opt
sudo git clone "$REPO_URL" mcp-lsp-bridge
cd mcp-lsp-bridge

echo "Building project..."
npm install
npm run build

echo "Installing language servers..."
sudo ./scripts/install-lsp-servers.sh

echo "Deploying service..."
sudo ./scripts/deploy.sh system

echo "Setting up Nginx..."
sudo ./scripts/setup-nginx.sh "$DOMAIN" "$EMAIL"

echo ""
echo "================================================================"
echo "  Manual Step Required: SSL Certificate"
echo "================================================================"
echo ""
echo "Run this command to get SSL certificate:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Then verify deployment:"
echo "  cd /opt/mcp-lsp-bridge"
echo "  ./scripts/verify-deployment.sh $DOMAIN 3000 true"
echo ""
EOFSCRIPT

chmod +x /tmp/deploy_mcp_remote.sh

echo "Copying deployment script to server..."
scp /tmp/deploy_mcp_remote.sh ${SSH_USER}@${SERVER}:/tmp/

echo "Running deployment on server..."
echo ""
ssh -t ${SSH_USER}@${SERVER} "bash /tmp/deploy_mcp_remote.sh '$REPO_URL' '$SERVER' 'admin@$SERVER'"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}║          Deployment Complete (Manual SSL Step Required)          ║${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. SSH to your server:"
echo -e "   ${YELLOW}ssh ${SSH_USER}@${SERVER}${NC}"
echo ""
echo "2. Get SSL certificate:"
echo -e "   ${YELLOW}sudo certbot --nginx -d ${SERVER}${NC}"
echo ""
echo "3. Edit Nginx config to enable HTTPS:"
echo -e "   ${YELLOW}sudo nano /etc/nginx/sites-available/${SERVER}${NC}"
echo "   (Uncomment the HTTPS server block)"
echo -e "   ${YELLOW}sudo systemctl reload nginx${NC}"
echo ""
echo "4. Verify deployment:"
echo -e "   ${YELLOW}cd /opt/mcp-lsp-bridge${NC}"
echo -e "   ${YELLOW}./scripts/verify-deployment.sh ${SERVER} 3000 true${NC}"
echo ""
echo -e "${GREEN}Your MCP URL will be: ${BLUE}https://${SERVER}/mcp${NC}"
echo ""
echo "Add to Claude:"
echo '{'
echo '  "mcpServers": {'
echo '    "lsp-bridge": {'
echo "      \"url\": \"https://${SERVER}/mcp\","
echo '      "transport": "streamableHttp"'
echo '    }'
echo '  }'
echo '}'
echo ""
