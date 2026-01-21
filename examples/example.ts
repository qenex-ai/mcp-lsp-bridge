// Example TypeScript file for testing LSP functionality

/**
 * Add two numbers together
 * @param a First number
 * @param b Second number
 * @returns Sum of a and b
 */
function add(a: number, b: number): number {
  return a + b;
}

/**
 * Multiply two numbers
 * @param x First number
 * @param y Second number
 * @returns Product of x and y
 */
function multiply(x: number, y: number): number {
  return x * y;
}

// Test the functions
const result1 = add(5, 3);
const result2 = multiply(4, 6);

console.log(`Addition result: ${result1}`);
console.log(`Multiplication result: ${result2}`);

// Try getting completions after the dot:
const message = "hello";
// Cursor position here: message.
