# MCP-LSP Bridge - Test Suite

## Overview

This test suite provides basic coverage for the MCP-LSP Bridge server functionality.

## Test Files

- **server.test.ts** - Core MCP server tests
- **lsp-integration.test.ts** - LSP protocol integration tests
- **http-transport.test.ts** - HTTP/SSE transport tests

## Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type check (no tests)
npm run typecheck
```

## Test Coverage

Current coverage areas:
- ✓ Server configuration
- ✓ MCP tool definitions
- ✓ LSP language support
- ✓ Protocol translation
- ✓ Document lifecycle
- ✓ HTTP transport
- ✓ Session management
- ✓ Security headers
- ✓ Health endpoints

## Adding Tests

When adding new functionality:

1. Create test file in `tests/` directory
2. Follow naming convention: `feature-name.test.ts`
3. Use describe blocks for grouping
4. Add both positive and negative test cases
5. Include error handling tests

## Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = processInput(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Future Improvements

- [ ] Integration tests with actual LSP servers
- [ ] E2E tests for HTTP endpoints
- [ ] Performance benchmarks
- [ ] Load testing for concurrent connections
- [ ] Mock LSP server responses
- [ ] Test coverage >70%
