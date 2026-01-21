import type { LSPServerConfig } from '../types/index.js';

/**
 * Configuration for all supported LSP servers
 */
export const lspServerConfigs: LSPServerConfig[] = [
  {
    language: 'typescript',
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    command: 'typescript-language-server',
    args: ['--stdio'],
    initializationOptions: {
      preferences: {
        includeInlayParameterNameHints: 'all',
        includeInlayFunctionParameterTypeHints: true,
        includeInlayVariableTypeHints: true,
      },
    },
  },
  {
    language: 'python',
    extensions: ['.py', '.pyi'],
    command: 'pylsp',
    args: [],
    initializationOptions: {},
  },
  {
    language: 'go',
    extensions: ['.go'],
    command: 'gopls',
    args: [],
    initializationOptions: {
      hints: {
        assignVariableTypes: true,
        compositeLiteralFields: true,
        constantValues: true,
        functionTypeParameters: true,
        parameterNames: true,
        rangeVariableTypes: true,
      },
    },
  },
  {
    language: 'rust',
    extensions: ['.rs'],
    command: 'rust-analyzer',
    args: [],
    initializationOptions: {
      cargo: {
        allFeatures: true,
      },
    },
  },
  {
    language: 'java',
    extensions: ['.java'],
    command: 'jdtls',
    args: [],
    initializationOptions: {},
  },
  {
    language: 'c',
    extensions: ['.c', '.h'],
    command: 'clangd',
    args: ['--background-index'],
    initializationOptions: {},
  },
  {
    language: 'cpp',
    extensions: ['.cpp', '.hpp', '.cc', '.cxx', '.hxx'],
    command: 'clangd',
    args: ['--background-index'],
    initializationOptions: {},
  },
  {
    language: 'ruby',
    extensions: ['.rb'],
    command: 'solargraph',
    args: ['stdio'],
    initializationOptions: {},
  },
  {
    language: 'php',
    extensions: ['.php'],
    command: 'php-language-server',
    args: [],
    initializationOptions: {},
  },
  {
    language: 'html',
    extensions: ['.html', '.htm'],
    command: 'vscode-html-language-server',
    args: ['--stdio'],
    initializationOptions: {},
  },
  {
    language: 'css',
    extensions: ['.css', '.scss', '.less'],
    command: 'vscode-css-language-server',
    args: ['--stdio'],
    initializationOptions: {},
  },
  {
    language: 'json',
    extensions: ['.json', '.jsonc'],
    command: 'vscode-json-language-server',
    args: ['--stdio'],
    initializationOptions: {},
  },
  {
    language: 'yaml',
    extensions: ['.yaml', '.yml'],
    command: 'yaml-language-server',
    args: ['--stdio'],
    initializationOptions: {},
  },
  {
    language: 'bash',
    extensions: ['.sh', '.bash'],
    command: 'bash-language-server',
    args: ['start'],
    initializationOptions: {},
  },
];

/**
 * Map file extension to LSP server configuration
 */
export const extensionToConfig = new Map<string, LSPServerConfig>();

// Build the extension map
for (const config of lspServerConfigs) {
  for (const ext of config.extensions) {
    extensionToConfig.set(ext, config);
  }
}

/**
 * Get LSP server config for a file extension
 * @param extension File extension (e.g., '.ts', '.py')
 * @returns LSP server config, or undefined if not found
 */
export function getConfigForExtension(extension: string): LSPServerConfig | undefined {
  return extensionToConfig.get(extension.toLowerCase());
}

/**
 * Get language ID from file extension
 * @param extension File extension (e.g., '.ts', '.py')
 * @returns Language ID, or undefined if not found
 */
export function getLanguageIdForExtension(extension: string): string | undefined {
  const config = getConfigForExtension(extension);
  return config?.language;
}

/**
 * Check if a file extension is supported
 * @param extension File extension (e.g., '.ts', '.py')
 * @returns True if supported
 */
export function isExtensionSupported(extension: string): boolean {
  return extensionToConfig.has(extension.toLowerCase());
}

/**
 * Get all supported file extensions
 * @returns Array of supported extensions
 */
export function getSupportedExtensions(): string[] {
  return Array.from(extensionToConfig.keys());
}
