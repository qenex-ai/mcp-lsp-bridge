#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport, EventStore } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * Simple in-memory implementation of the EventStore interface for resumability
 */
class InMemoryEventStore implements EventStore {
  private events: Map<string, { streamId: string; message: JSONRPCMessage }> = new Map();

  private generateEventId(streamId: string): string {
    return `${streamId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private getStreamIdFromEventId(eventId: string): string {
    const parts = eventId.split('_');
    return parts.length > 0 ? parts[0] : '';
  }

  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = this.generateEventId(streamId);
    this.events.set(eventId, { streamId, message });
    return eventId;
  }

  async replayEventsAfter(
    lastEventId: string,
    { send }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> }
  ): Promise<string> {
    if (!lastEventId || !this.events.has(lastEventId)) {
      return '';
    }

    const streamId = this.getStreamIdFromEventId(lastEventId);
    if (!streamId) {
      return '';
    }

    let foundLastEvent = false;
    const sortedEvents = [...this.events.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    for (const [eventId, { streamId: eventStreamId, message }] of sortedEvents) {
      if (eventStreamId !== streamId) {
        continue;
      }

      if (eventId === lastEventId) {
        foundLastEvent = true;
        continue;
      }

      if (foundLastEvent) {
        await send(eventId, message);
      }
    }

    return streamId;
  }
}

/**
 * Start the HTTP server for remote MCP access
 */
async function startHttpServer() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();

  logger.info(`Starting MCP-LSP Bridge HTTP server`);
  logger.info(`Workspace root: ${workspaceRoot}`);

  // Create plain Express app
  const app = express();
  app.use(express.json());

  // Map to store transports by session ID
  const transports: Map<string, StreamableHTTPServerTransport> = new Map();

  // MCP POST endpoint for JSON-RPC requests
  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId) {
      logger.debug(`Received MCP request for session: ${sessionId}`);
    }

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport
        transport = transports.get(sessionId)!;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request
        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          eventStore, // Enable resumability
          onsessioninitialized: (newSessionId) => {
            logger.info(`Session initialized with ID: ${newSessionId}`);
            transports.set(newSessionId, transport);
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) {
            logger.info(`Transport closed for session ${sid}`);
            transports.delete(sid);
          }
        };

        // Connect the transport to the MCP server
        const server = createServer(workspaceRoot);
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided'
          },
          id: null
        });
        return;
      }

      // Handle the request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    }
  });

  // MCP GET endpoint for SSE streams
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      logger.debug(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      logger.debug(`Establishing new SSE stream for session ${sessionId}`);
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // MCP DELETE endpoint for session termination
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    logger.info(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    } catch (error) {
      logger.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      activeSessions: transports.size,
      workspaceRoot
    });
  });

  // Start listening
  app.listen(port, host, () => {
    logger.info(`MCP-LSP Bridge HTTP server listening on http://${host}:${port}`);
    logger.info(`MCP endpoint: http://${host}:${port}/mcp`);
    logger.info(`Health check: http://${host}:${port}/health`);
  });

  // Handle server shutdown
  const shutdown = async () => {
    logger.info('Shutting down HTTP server...');

    // Close all active transports
    for (const [sessionId, transport] of transports.entries()) {
      try {
        logger.info(`Closing transport for session ${sessionId}`);
        await transport.close();
        transports.delete(sessionId);
      } catch (error) {
        logger.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }

    logger.info('HTTP server shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer().catch((error) => {
    logger.error('Failed to start HTTP server:', error);
    process.exit(1);
  });
}

export { startHttpServer };
