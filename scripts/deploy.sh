#!/bin/bash
set -e

echo "🚀 MCP-LSP Bridge Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root for system-wide installation
if [ "$EUID" -ne 0 ] && [ "$1" == "system" ]; then
    echo -e "${RED}Please run with sudo for system-wide installation${NC}"
    exit 1
fi

# Deployment directory
DEPLOY_DIR="/opt/mcp-lsp-bridge"
SERVICE_NAME="mcp-lsp-bridge"

echo "Step 1: Building the project..."
npm install
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# System-wide installation
if [ "$1" == "system" ]; then
    echo "Step 2: Installing to $DEPLOY_DIR..."

    # Create deployment directory
    mkdir -p $DEPLOY_DIR

    # Copy necessary files
    cp -r dist package*.json $DEPLOY_DIR/
    cp .env $DEPLOY_DIR/.env 2>/dev/null || cp .env.example $DEPLOY_DIR/.env

    # Install production dependencies
    cd $DEPLOY_DIR
    npm ci --only=production

    echo -e "${GREEN}✓ Installed to $DEPLOY_DIR${NC}"
    echo ""

    echo "Step 3: Setting up systemd service..."

    # Create systemd service file
    cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=MCP-LSP Bridge HTTP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$DEPLOY_DIR
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=/usr/bin/node $DEPLOY_DIR/dist/http-server.js
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload

    echo -e "${GREEN}✓ Systemd service created${NC}"
    echo ""

    echo "Step 4: Starting service..."
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME

    echo -e "${GREEN}✓ Service started${NC}"
    echo ""

    echo "Step 5: Checking status..."
    systemctl status $SERVICE_NAME --no-pager
    echo ""

    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  sudo systemctl status $SERVICE_NAME    - Check service status"
    echo "  sudo systemctl restart $SERVICE_NAME   - Restart service"
    echo "  sudo journalctl -u $SERVICE_NAME -f    - View logs"
    echo "  curl http://localhost:3000/health       - Health check"

elif [ "$1" == "docker" ]; then
    echo "Step 2: Building Docker image..."
    docker build -t mcp-lsp-bridge:latest .
    echo -e "${GREEN}✓ Docker image built${NC}"
    echo ""

    echo "Step 3: Starting Docker container..."
    docker-compose up -d
    echo -e "${GREEN}✓ Container started${NC}"
    echo ""

    echo "Step 4: Checking status..."
    docker-compose ps
    docker-compose logs --tail=20
    echo ""

    echo -e "${GREEN}✅ Deployment complete!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose ps              - Check container status"
    echo "  docker-compose logs -f         - View logs"
    echo "  docker-compose restart         - Restart container"
    echo "  curl http://localhost:3000/health  - Health check"

else
    echo "Usage:"
    echo "  ./scripts/deploy.sh system     - Deploy as systemd service"
    echo "  ./scripts/deploy.sh docker     - Deploy with Docker"
    echo ""
    echo -e "${YELLOW}Build complete. Choose a deployment method.${NC}"
fi
