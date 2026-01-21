#!/bin/bash
set -e

echo "📦 MCP-LSP Bridge Language Server Installation"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to install a package
install_if_missing() {
    local name=$1
    local command=$2
    local check_cmd=$3

    echo -n "Checking $name... "
    if eval $check_cmd > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Already installed${NC}"
    else
        echo -e "${YELLOW}Installing...${NC}"
        eval $command
        echo -e "${GREEN}✓ Installed${NC}"
    fi
}

echo "1. Node.js Language Servers"
echo "----------------------------"
install_if_missing "TypeScript Language Server" \
    "npm install -g typescript typescript-language-server" \
    "command -v typescript-language-server"

install_if_missing "YAML Language Server" \
    "npm install -g yaml-language-server" \
    "command -v yaml-language-server"

install_if_missing "Bash Language Server" \
    "npm install -g bash-language-server" \
    "command -v bash-language-server"

install_if_missing "VSCode Language Servers (HTML/CSS/JSON)" \
    "npm install -g vscode-langservers-extracted" \
    "command -v vscode-html-language-server"

echo ""
echo "2. Python Language Server"
echo "-------------------------"
install_if_missing "Python LSP Server" \
    "pip3 install 'python-lsp-server[all]'" \
    "command -v pylsp"

echo ""
echo "3. Go Language Server"
echo "---------------------"
if command -v go > /dev/null 2>&1; then
    install_if_missing "gopls" \
        "go install golang.org/x/tools/gopls@latest" \
        "command -v gopls"

    # Ensure GOPATH/bin is in PATH
    if ! echo $PATH | grep -q "$HOME/go/bin"; then
        echo -e "${YELLOW}⚠ Add \$HOME/go/bin to your PATH:${NC}"
        echo "  export PATH=\$PATH:\$HOME/go/bin"
    fi
else
    echo -e "${YELLOW}⚠ Go not installed - skipping gopls${NC}"
fi

echo ""
echo "4. Rust Language Server"
echo "-----------------------"
if command -v rustup > /dev/null 2>&1; then
    install_if_missing "rust-analyzer" \
        "rustup component add rust-analyzer" \
        "rustup component list | grep -q 'rust-analyzer.*installed'"
else
    echo -e "${YELLOW}⚠ Rust not installed - skipping rust-analyzer${NC}"
fi

echo ""
echo "5. C/C++ Language Server"
echo "------------------------"
if command -v apt-get > /dev/null 2>&1; then
    install_if_missing "clangd" \
        "sudo apt-get install -y clangd" \
        "command -v clangd"
elif command -v brew > /dev/null 2>&1; then
    install_if_missing "clangd" \
        "brew install llvm" \
        "command -v clangd"
else
    echo -e "${YELLOW}⚠ Package manager not detected - install clangd manually${NC}"
fi

echo ""
echo "6. Ruby Language Server"
echo "-----------------------"
if command -v gem > /dev/null 2>&1; then
    install_if_missing "Solargraph" \
        "gem install solargraph" \
        "command -v solargraph"
else
    echo -e "${YELLOW}⚠ Ruby not installed - skipping solargraph${NC}"
fi

echo ""
echo "7. PHP Language Server"
echo "----------------------"
if command -v composer > /dev/null 2>&1; then
    install_if_missing "PHP Language Server" \
        "composer global require felixfbecker/language-server" \
        "composer global show | grep -q felixfbecker/language-server"

    # Ensure composer bin is in PATH
    if ! echo $PATH | grep -q "$HOME/.composer/vendor/bin"; then
        echo -e "${YELLOW}⚠ Add Composer bin to your PATH:${NC}"
        echo "  export PATH=\$PATH:\$HOME/.composer/vendor/bin"
    fi
else
    echo -e "${YELLOW}⚠ Composer not installed - skipping PHP language server${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Language server installation complete!${NC}"
echo ""
echo "Installed language servers:"
echo "  ✓ TypeScript/JavaScript - typescript-language-server"
echo "  ✓ YAML - yaml-language-server"
echo "  ✓ Bash - bash-language-server"
echo "  ✓ HTML/CSS/JSON - vscode-langservers-extracted"

command -v pylsp > /dev/null && echo "  ✓ Python - pylsp"
command -v gopls > /dev/null && echo "  ✓ Go - gopls"
command -v rust-analyzer > /dev/null && echo "  ✓ Rust - rust-analyzer"
command -v clangd > /dev/null && echo "  ✓ C/C++ - clangd"
command -v solargraph > /dev/null && echo "  ✓ Ruby - solargraph"

echo ""
echo "Verify installation:"
echo "  which typescript-language-server"
echo "  which pylsp"
echo "  which gopls"
