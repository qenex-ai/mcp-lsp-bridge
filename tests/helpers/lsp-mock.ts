/**
 * Mock LSP server for testing
 *
 * This module provides utilities for creating mock LSP servers
 * to test LSP client functionality without requiring real language servers.
 */

export interface MockLSPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  onRequest(method: string, handler: (params: any) => any): void;
  sendNotification(method: string, params: any): void;
}

export class MockTypeScriptServer implements MockLSPServer {
  private handlers: Map<string, (params: any) => any> = new Map();

  async start(): Promise<void> {
    // Simulate server startup
  }

  async stop(): Promise<void> {
    // Simulate server shutdown
  }

  onRequest(method: string, handler: (params: any) => any): void {
    this.handlers.set(method, handler);
  }

  sendNotification(method: string, params: any): void {
    // Send notification to client
  }

  /**
   * Mock completion response
   */
  mockCompletion(position: { line: number; character: number }) {
    return {
      items: [
        {
          label: 'push',
          kind: 2, // Method
          detail: '(method) Array<T>.push(...items: T[]): number',
        },
        {
          label: 'map',
          kind: 2,
          detail: '(method) Array<T>.map<U>(callbackfn: ...): U[]',
        },
      ],
    };
  }

  /**
   * Mock hover response
   */
  mockHover(position: { line: number; character: number }) {
    return {
      contents: {
        kind: 'markdown',
        value: '```typescript\nconst message: string\n```',
      },
    };
  }

  /**
   * Mock diagnostics response
   */
  mockDiagnostics(hasErrors: boolean = false) {
    if (!hasErrors) {
      return [];
    }

    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        severity: 1, // Error
        message: 'Type \'string\' is not assignable to type \'number\'.',
        source: 'ts',
      },
    ];
  }
}

/**
 * Create a mock LSP server for testing
 */
export function createMockLSPServer(language: string): MockLSPServer {
  switch (language) {
    case 'typescript':
      return new MockTypeScriptServer();
    default:
      throw new Error(`No mock server available for language: ${language}`);
  }
}
