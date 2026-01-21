FROM node:20-slim

# Install language servers and build tools
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    clangd \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js language servers
RUN npm install -g typescript typescript-language-server \
    yaml-language-server \
    bash-language-server \
    vscode-langservers-extracted

# Install Python language server
RUN pip3 install 'python-lsp-server[all]' --break-system-packages

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove source files after build
RUN rm -rf src tsconfig.json

# Expose port
EXPOSE 3000

# Set default environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV WORKSPACE_ROOT=/workspace
ENV LOG_LEVEL=INFO

# Create workspace directory
RUN mkdir -p /workspace

# Run as non-root user
RUN useradd -m -u 1000 mcpuser && \
    chown -R mcpuser:mcpuser /app /workspace
USER mcpuser

CMD ["node", "dist/http-server.js"]
