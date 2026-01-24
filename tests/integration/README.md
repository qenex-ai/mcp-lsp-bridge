# Integration Tests

Integration tests for MCP-LSP Bridge with real or mock Language Server Protocol servers.

## Overview

These tests verify that the MCP-LSP Bridge correctly integrates with LSP servers and handles the full request/response cycle.

## Test Files

- **typescript-lsp.test.ts** - TypeScript language server integration
- **python-lsp.test.ts** - Python language server integration
- Additional language tests can be added following the same pattern

## Running Integration Tests

### Prerequisites

Install the language servers you want to test:

```bash
# TypeScript
npm install -g typescript typescript-language-server

# Python
pip install 'python-lsp-server[all]'

# Go
go install golang.org/x/tools/gopls@latest

# Rust
rustup component add rust-analyzer
```

### Run Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific language tests
npm run test:integration -- typescript-lsp

# Run with UI
npm run test:ui tests/integration
```

## Test Structure

Each language test file follows this pattern:

```typescript
describe('Language LSP Integration', () => {
  beforeAll(async () => {
    // Start LSP server
  });

  afterAll(async () => {
    // Stop LSP server
  });

  describe('Connection & Initialization', () => {
    it('should connect to language server', async () => {
      // Test connection
    });
  });

  describe('Code Completion', () => {
    it('should provide completions', async () => {
      // Test completions
    });
  });

  // ... more test categories
});
```

## Mock vs Real Servers

### Using Mock Servers (Faster)

Mock servers are useful for:
- Fast unit-like tests
- CI/CD pipelines
- Testing error scenarios
- Consistent test results

```typescript
import { createMockLSPServer } from '../helpers/lsp-mock';

const mockServer = createMockLSPServer('typescript');
await mockServer.start();
```

### Using Real Servers (Comprehensive)

Real servers are needed for:
- End-to-end validation
- Protocol compliance testing
- Performance testing
- Actual language server behavior

```typescript
// Real server tests require actual LSP installations
// Tests will skip if language server not found
```

## Helper Functions

Located in `tests/helpers/`:

- **lsp-mock.ts** - Mock LSP server implementations
- **test-utils.ts** - Common test utilities

## Adding New Language Tests

1. Create `tests/integration/{language}-lsp.test.ts`
2. Follow the existing test structure
3. Add language-specific test cases
4. Update this README

Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('Go LSP Integration', () => {
  // Test cases for Go language server
});
```

## Troubleshooting

### Language Server Not Found

If tests fail with "language server not found":

1. Verify the language server is installed
2. Check PATH includes language server location
3. Set environment variable if needed:

```bash
export PATH=$PATH:/path/to/language/server
```

### Connection Timeout

If tests timeout connecting to LSP:

1. Increase timeout in test config
2. Check language server logs
3. Verify workspace path is correct

### Flaky Tests

If tests are inconsistent:

1. Add proper wait conditions
2. Use `waitFor()` helper for async operations
3. Ensure proper cleanup in `afterAll()`

## CI/CD Integration

Integration tests run in CI/CD pipeline:

```yaml
- name: Install Language Servers
  run: |
    npm install -g typescript-language-server
    pip install python-lsp-server

- name: Run Integration Tests
  run: npm run test:integration
```

## Future Enhancements

- [ ] Add more language server tests (Go, Rust, etc.)
- [ ] Performance benchmarking
- [ ] Stress testing (many concurrent requests)
- [ ] Error recovery testing
- [ ] Protocol compliance validation
- [ ] Real workspace scenarios
