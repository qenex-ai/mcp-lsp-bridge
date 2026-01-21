#!/bin/bash
# Commit all changes and prepare for deployment

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}║          MCP-LSP Bridge - Commit & Prepare                       ║${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if git repository
if [ ! -d .git ]; then
    echo -e "${YELLOW}Initializing git repository...${NC}"
    git init
    git branch -M main
fi

# Add all files
echo -e "${GREEN}Adding all files...${NC}"
git add .

# Show status
echo ""
echo -e "${GREEN}Files to be committed:${NC}"
git status --short

# Commit
echo ""
echo -e "${GREEN}Creating commit...${NC}"
git commit -m "MCP-LSP Bridge ready for qenex.ai deployment

- HTTP server with StreamableHTTP transport
- 10+ language servers supported
- Session management & resumability
- Complete deployment automation
- Nginx + SSL configuration
- Docker & systemd support
- Comprehensive documentation

Ready to deploy to: https://qenex.ai/mcp" || echo "No changes to commit"

# Check remote
REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -z "$REMOTE" ]; then
    echo ""
    echo -e "${YELLOW}⚠  No git remote configured${NC}"
    echo ""
    echo "To push to GitHub/GitLab:"
    echo "  1. Create a repository on GitHub/GitLab"
    echo "  2. git remote add origin <your-repo-url>"
    echo "  3. git push -u origin main"
    echo ""
else
    echo ""
    echo -e "${GREEN}Remote repository: ${REMOTE}${NC}"
    echo ""
    read -p "Push to remote now? (y/n): " PUSH
    if [ "$PUSH" = "y" ]; then
        echo -e "${GREEN}Pushing to remote...${NC}"
        git push || git push -u origin main
        echo -e "${GREEN}✓ Pushed successfully${NC}"
    fi
fi

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}║          Ready for Deployment!                                   ║${NC}"
echo -e "${BLUE}║                                                                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Run automated deployment:"
echo -e "   ${YELLOW}./DEPLOY_NOW.sh${NC}"
echo ""
echo "2. Or follow manual guide:"
echo -e "   ${YELLOW}cat NEXT_ACTIONS.md${NC}"
echo ""
echo "Your MCP URL will be: https://qenex.ai/mcp"
echo ""
