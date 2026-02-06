# Contributing to MCP-LSP Bridge

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the MCP-LSP Bridge project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)
- [Adding Language Support](#adding-language-support)

## Code of Conduct

This project follows a standard code of conduct:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## Getting Started

1. Fork the repository on GitLab or GitHub
2. Clone your fork locally
3. Set up the development environment
4. Create a feature branch
5. Make your changes
6. Submit a merge request (GitLab) or pull request (GitHub)

## Development Setup

### Prerequisites

- Node.js 18+ (recommended: 20.x)
- npm 9+
- Git
- Language servers for testing (optional)

### Initial Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mcp-lsp-bridge.git
cd mcp-lsp-bridge

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Verify Setup

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Run all tests
npm test

# Run integration tests (requires language servers)
npm run test:integration
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-rust-support` - New features
- `fix/completion-timeout` - Bug fixes
- `docs/update-readme` - Documentation
- `refactor/simplify-client-manager` - Code improvements
- `test/add-integration-tests` - Test additions

### Commit Messages

Follow conventional commits format:

```
type(scope): brief description

Detailed explanation of what changed and why.

Fixes #123
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

Examples:

```
feat(lsp): add support for Rust language server

- Add rust-analyzer configuration
- Implement Rust-specific protocol extensions
- Add integration tests for Rust

Closes #45

---

fix(http): handle SSE reconnection timeout

The SSE connection was timing out after 30 seconds of
inactivity. Now sends keep-alive pings every 15 seconds.

Fixes #67
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Watch mode during development
npm test -- --watch

# Specific test file
npm test server.test.ts

# Integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

### Writing Tests

#### Unit Tests

Place unit tests in `tests/` directory:

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

#### Integration Tests

Place integration tests in `tests/integration/`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('LSP Integration', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should integrate with language server', async () => {
    // Test
  });
});
```

### Test Coverage Requirements

- Minimum 70% code coverage
- All new features must include tests
- Bug fixes should include regression tests

## Submitting Changes

### Pull Request Process

1. **Update your fork**

```bash
git checkout main
git pull upstream main
git push origin main
```

2. **Create feature branch**

```bash
git checkout -b feature/my-feature
```

3. **Make changes and commit**

```bash
git add .
git commit -m "feat: add new feature"
```

4. **Push to your fork**

```bash
git push origin feature/my-feature
```

5. **Create Pull Request**

- Go to GitHub
- Click "New Pull Request"
- Select your fork and branch
- Fill in the PR template
- Submit for review

### Pull Request Checklist

Before submitting, ensure:

- [ ] Code follows style guide
- [ ] All tests pass locally
- [ ] Coverage meets requirements (≥70%)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG updated (for significant changes)
- [ ] Commit messages follow conventions
- [ ] PR description is clear and complete

### PR Review Process

1. Automated checks (CI/CD) must pass
2. Code review by maintainers
3. Address review comments
4. Final approval from maintainer
5. Merge to main branch

## Style Guide

### TypeScript/JavaScript

Follow the ESLint configuration:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

Key conventions:

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use explicit types for function returns
- Use interfaces for object shapes
- Avoid `any`, use `unknown` instead
- Use async/await over raw promises

### Code Formatting

Use Prettier for consistent formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### File Organization

```
src/
  ├── lsp/              # LSP client logic
  ├── tools/            # MCP tool implementations
  ├── utils/            # Utility functions
  ├── types/            # TypeScript type definitions
  ├── config/           # Language server configs
  ├── server.ts         # Core MCP server
  ├── index.ts          # STDIO entry
  └── http-server-simple.ts  # HTTP entry

tests/
  ├── unit/             # Unit tests
  ├── integration/      # Integration tests
  └── helpers/          # Test utilities
```

## Adding Language Support

To add a new language server:

### 1. Create Language Configuration

Create `src/config/{language}.ts`:

```typescript
export const languageConfig = {
  languageId: 'rust',
  serverCommand: 'rust-analyzer',
  serverArgs: [],
  fileExtensions: ['.rs'],
  initializationOptions: {
    // Language-specific options
  }
};
```

### 2. Register in Client Manager

Add to `src/lsp/client-manager.ts`:

```typescript
import { rustConfig } from '../config/rust';

// Add to language configs map
this.languageConfigs.set('rust', rustConfig);
```

### 3. Add Integration Tests

Create `tests/integration/rust-lsp.test.ts`:

```typescript
describe('Rust LSP Integration', () => {
  // Test cases
});
```

### 4. Update Documentation

- Add to README.md supported languages table
- Update language server installation instructions
- Add examples for the new language

### 5. Submit PR

- Include all files (config, tests, docs)
- Provide example usage
- Test with real language server

## Development Workflow

### Daily Development

```bash
# Start development mode (STDIO)
npm run dev

# Start HTTP server with hot reload
npm run dev:http

# Run tests in watch mode
npm test -- --watch

# Check types continuously
npm run typecheck -- --watch
```

### Before Committing

```bash
# Run all checks
npm run typecheck
npm run lint
npm test
npm run build
```

### CI/CD Pipeline

GitLab CI/CD automatically runs:

1. Type checking
2. Linting
3. Build
4. Tests (Node.js 18, 20, 22)
5. Coverage report (with GitLab visualization)
6. Security audit (npm audit + Trivy)
7. Docker build

**Note:** GitHub Actions is also configured but may be disabled

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Review existing issues and PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to MCP-LSP Bridge! 🎉
