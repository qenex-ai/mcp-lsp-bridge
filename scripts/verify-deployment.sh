#!/bin/bash

echo "🔍 MCP-LSP Bridge Deployment Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN="${1:-qenex.ai}"
PORT="${2:-3000}"
USE_HTTPS="${3:-false}"

if [ "$USE_HTTPS" == "true" ]; then
    PROTOCOL="https"
    URL="https://$DOMAIN/mcp"
else
    PROTOCOL="http"
    URL="http://$DOMAIN:$PORT/mcp"
fi

# Function to check a service
check_service() {
    local name=$1
    local command=$2

    echo -n "Checking $name... "
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local name=$1
    local url=$2

    echo -n "Checking $name... "
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" == "200" ]; then
        echo -e "${GREEN}✓ (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ (HTTP $response)${NC}"
        return 1
    fi
}

echo "1. System Checks"
echo "----------------"
check_service "Node.js" "command -v node"
check_service "npm" "command -v npm"
echo ""

echo "2. Service Status"
echo "-----------------"
if systemctl is-active --quiet mcp-lsp-bridge; then
    echo -e "${GREEN}✓ MCP-LSP Bridge service is running${NC}"

    # Show recent logs
    echo ""
    echo "Recent logs:"
    journalctl -u mcp-lsp-bridge -n 5 --no-pager
elif docker ps | grep -q mcp-lsp-bridge; then
    echo -e "${GREEN}✓ MCP-LSP Bridge container is running${NC}"

    # Show recent logs
    echo ""
    echo "Recent logs:"
    docker logs mcp-lsp-bridge --tail 5
else
    echo -e "${YELLOW}⚠ Service/Container not detected${NC}"
fi
echo ""

echo "3. Network Checks"
echo "-----------------"
check_service "Port $PORT listening" "netstat -tuln | grep -q :$PORT || ss -tuln | grep -q :$PORT"
echo ""

echo "4. API Endpoint Checks"
echo "----------------------"

# Check health endpoint
if [ "$USE_HTTPS" == "true" ]; then
    check_endpoint "Health endpoint (HTTPS)" "https://$DOMAIN/health"
else
    check_endpoint "Health endpoint (HTTP)" "http://localhost:$PORT/health"
fi

# Try to get health details
echo ""
echo "Health endpoint response:"
if [ "$USE_HTTPS" == "true" ]; then
    curl -s "https://$DOMAIN/health" | jq '.' 2>/dev/null || curl -s "https://$DOMAIN/health"
else
    curl -s "http://localhost:$PORT/health" | jq '.' 2>/dev/null || curl -s "http://localhost:$PORT/health"
fi
echo ""
echo ""

echo "5. SSL/TLS Checks (if applicable)"
echo "----------------------------------"
if [ "$USE_HTTPS" == "true" ]; then
    echo -n "SSL certificate... "
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        echo -e "${GREEN}✓ Valid${NC}"

        # Show certificate details
        echo ""
        echo "Certificate details:"
        echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null
    else
        echo -e "${RED}✗ Invalid or missing${NC}"
    fi
else
    echo -e "${YELLOW}⚠ HTTPS not configured (using HTTP)${NC}"
fi
echo ""

echo "6. DNS Checks"
echo "-------------"
echo -n "DNS resolution for $DOMAIN... "
if host $DOMAIN > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    host $DOMAIN | head -3
else
    echo -e "${RED}✗${NC}"
fi
echo ""

echo "7. Firewall Checks"
echo "------------------"
if command -v ufw > /dev/null 2>&1; then
    echo "UFW status:"
    ufw status | grep -E "Status|$PORT|80|443" || echo "UFW not active"
else
    echo -e "${YELLOW}⚠ UFW not installed${NC}"
fi
echo ""

echo "8. MCP URL Summary"
echo "------------------"
echo "Your MCP URL: $URL"
echo ""

if [ "$USE_HTTPS" == "true" ]; then
    echo "Configuration for Claude:"
    echo '{'
    echo '  "mcpServers": {'
    echo '    "lsp-bridge": {'
    echo "      \"url\": \"$URL\","
    echo '      "transport": "streamableHttp"'
    echo '    }'
    echo '  }'
    echo '}'
else
    echo -e "${YELLOW}⚠ Using HTTP - For production, set up HTTPS with:${NC}"
    echo "  sudo ./scripts/setup-nginx.sh $DOMAIN"
    echo "  sudo certbot --nginx -d $DOMAIN"
fi
echo ""

echo "=================================="
echo "Verification complete!"
echo ""
echo "If issues were found, check:"
echo "  - Service logs: journalctl -u mcp-lsp-bridge -f"
echo "  - Or container logs: docker logs -f mcp-lsp-bridge"
echo "  - Environment file: cat .env"
echo "  - Firewall rules: sudo ufw status"
