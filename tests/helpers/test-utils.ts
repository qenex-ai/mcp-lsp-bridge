/**
 * Test utilities and helper functions
 */

/**
 * Create a temporary test workspace directory
 */
export function createTestWorkspace(): string {
  // In real implementation, create temp directory
  return '/tmp/test-workspace';
}

/**
 * Clean up test workspace
 */
export function cleanupTestWorkspace(workspacePath: string): void {
  // In real implementation, remove temp directory
}

/**
 * Create a test file with content
 */
export function createTestFile(
  workspacePath: string,
  relativePath: string,
  content: string
): string {
  // In real implementation, write file to workspace
  return `${workspacePath}/${relativePath}`;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock LSP position
 */
export function createPosition(line: number, character: number) {
  return { line, character };
}

/**
 * Mock LSP range
 */
export function createRange(
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number
) {
  return {
    start: createPosition(startLine, startChar),
    end: createPosition(endLine, endChar),
  };
}

/**
 * Generate unique file URI
 */
export function createFileURI(workspacePath: string, relativePath: string): string {
  return `file://${workspacePath}/${relativePath}`;
}

/**
 * Assert that value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Assert that array contains element
 */
export function assertContains<T>(array: T[], element: T, message?: string): void {
  if (!array.includes(element)) {
    throw new Error(message || `Expected array to contain ${element}`);
  }
}
