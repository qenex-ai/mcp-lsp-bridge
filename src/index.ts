#!/usr/bin/env node

import { runServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the MCP-LSP Bridge server
 */
async function main() {
  try {
    // Get workspace root from command line args or environment variable
    const workspaceRoot = process.argv[2] || process.env.WORKSPACE_ROOT || process.cwd();

    logger.info(`Starting MCP-LSP Bridge server`);
    logger.info(`Workspace root: ${workspaceRoot}`);

    // Run the server
    await runServer(workspaceRoot);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
