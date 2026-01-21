import { fileURLToPath, pathToFileURL } from 'node:url';
import { platform } from 'node:os';
import { resolve, normalize } from 'node:path';

/**
 * Convert a file path to a URI string
 * @param filePath Absolute or relative file path
 * @returns URI string (e.g., 'file:///path/to/file.ts')
 */
export function pathToUri(filePath: string): string {
  // Resolve to absolute path first
  const absolutePath = resolve(filePath);

  // Use pathToFileURL for proper URI encoding
  const uri = pathToFileURL(absolutePath).href;

  return uri;
}

/**
 * Convert a URI string to a file path
 * @param uri URI string (e.g., 'file:///path/to/file.ts')
 * @returns Normalized file path
 */
export function uriToPath(uri: string): string {
  try {
    // Handle file:// URIs
    if (uri.startsWith('file://')) {
      return fileURLToPath(uri);
    }

    // If not a file URI, assume it's already a path
    return normalize(uri);
  } catch (error) {
    // Fallback: just return the original string
    return uri;
  }
}

/**
 * Normalize a file path for the current platform
 * @param filePath File path
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return normalize(filePath);
}

/**
 * Get the file extension from a file path or URI
 * @param filePathOrUri File path or URI
 * @returns File extension including the dot (e.g., '.ts'), or empty string if none
 */
export function getFileExtension(filePathOrUri: string): string {
  const path = filePathOrUri.startsWith('file://')
    ? uriToPath(filePathOrUri)
    : filePathOrUri;

  const lastDot = path.lastIndexOf('.');
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));

  // Make sure the dot is after the last slash (not in a directory name)
  if (lastDot > lastSlash) {
    return path.substring(lastDot);
  }

  return '';
}

/**
 * Check if a path is absolute
 * @param filePath File path
 * @returns True if the path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  // Windows: starts with drive letter (C:) or UNC path (\\)
  if (platform() === 'win32') {
    return /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith('\\\\');
  }

  // Unix: starts with /
  return filePath.startsWith('/');
}
