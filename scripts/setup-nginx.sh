#!/bin/bash
set -e

echo "🌐 MCP-LSP Bridge Nginx Setup Script"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

# Configuration
DOMAIN="${1:-qenex.ai}"
EMAIL="${2:-admin@${DOMAIN}}"
MCP_PORT="${3:-3000}"

echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "MCP Port: $MCP_PORT"
echo ""

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
    echo -e "${GREEN}✓ Nginx installed${NC}"
else
    echo -e "${GREEN}✓ Nginx already installed${NC}"
fi
echo ""

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi
echo ""

# Create Nginx configuration
echo "Creating Nginx configuration..."

cat > /etc/nginx/sites-available/$DOMAIN <<EOF
upstream mcp-lsp-bridge {
    server 127.0.0.1:$MCP_PORT;
}

server {
    listen 80;
    server_name $DOMAIN;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect to HTTPS (will be enabled after SSL setup)
    # return 301 https://\$server_name\$request_uri;

    # Temporary: proxy to backend before SSL
    location /mcp {
        proxy_pass http://mcp-lsp-bridge;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts for long-running requests
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;
    }

    location /health {
        proxy_pass http://mcp-lsp-bridge;
        proxy_set_header Host \$host;
    }
}

# HTTPS server (uncomment after obtaining SSL certificate)
# server {
#     listen 443 ssl http2;
#     server_name $DOMAIN;
#
#     ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
#
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     location /mcp {
#         proxy_pass http://mcp-lsp-bridge;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection "upgrade";
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#
#         proxy_connect_timeout 7d;
#         proxy_send_timeout 7d;
#         proxy_read_timeout 7d;
#
#         proxy_buffering off;
#         proxy_cache off;
#     }
#
#     location /health {
#         proxy_pass http://mcp-lsp-bridge;
#         proxy_set_header Host \$host;
#     }
# }
EOF

echo -e "${GREEN}✓ Nginx configuration created${NC}"
echo ""

# Enable site
echo "Enabling site..."
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default site
echo -e "${GREEN}✓ Site enabled${NC}"
echo ""

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t
echo -e "${GREEN}✓ Nginx configuration valid${NC}"
echo ""

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

echo -e "${YELLOW}⚠️  SSL Certificate Setup${NC}"
echo ""
echo "To obtain an SSL certificate, ensure:"
echo "1. Your domain $DOMAIN points to this server's IP"
echo "2. Port 80 is open in your firewall"
echo ""
echo "Then run:"
echo "  sudo certbot --nginx -d $DOMAIN"
echo ""
echo "After obtaining the certificate:"
echo "1. Edit /etc/nginx/sites-available/$DOMAIN"
echo "2. Uncomment the HTTPS server block"
echo "3. Comment out or remove the HTTP proxy location"
echo "4. Reload nginx: sudo systemctl reload nginx"
echo ""

echo -e "${GREEN}✅ Nginx setup complete!${NC}"
echo ""
echo "Test your setup:"
echo "  curl http://$DOMAIN/health"
echo "  curl http://localhost:$MCP_PORT/health"
