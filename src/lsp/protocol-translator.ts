import type {
  CompletionList,
  CompletionItem,
  Hover,
  Location,
  LocationLink,
  Diagnostic,
  WorkspaceEdit,
  TextEdit,
  SymbolInformation,
  DocumentSymbol,
  CodeAction,
  Command,
} from 'vscode-languageserver-protocol';
import { uriToPath } from '../utils/uri.js';

/**
 * Format completion items as markdown for LLM consumption
 */
export function formatCompletionResult(result: CompletionList | CompletionItem[] | null): string {
  if (!result) {
    return 'No completions available.';
  }

  const items = Array.isArray(result) ? result : result.items;

  if (items.length === 0) {
    return 'No completions available.';
  }

  let output = `Found ${items.length} completion${items.length !== 1 ? 's' : ''}:\n\n`;

  for (const item of items.slice(0, 50)) {
    output += `- **${item.label}**`;

    if (item.kind !== undefined) {
      const kindName = getCompletionItemKindName(item.kind);
      output += ` _(${kindName})_`;
    }

    if (item.detail) {
      output += ` — ${item.detail}`;
    }

    if (item.documentation) {
      const doc = typeof item.documentation === 'string'
        ? item.documentation
        : item.documentation.value;
      const truncated = doc.length > 100 ? doc.substring(0, 100) + '...' : doc;
      output += `\n  ${truncated}`;
    }

    output += '\n';
  }

  if (items.length > 50) {
    output += `\n_...and ${items.length - 50} more_`;
  }

  return output;
}

/**
 * Format hover information as markdown for LLM consumption
 */
export function formatHoverResult(result: Hover | null): string {
  if (!result || !result.contents) {
    return 'No hover information available.';
  }

  const contents = Array.isArray(result.contents) ? result.contents : [result.contents];

  let output = '';

  for (const content of contents) {
    if (typeof content === 'string') {
      output += content + '\n\n';
    } else if ('language' in content) {
      // MarkedString with language
      output += `\`\`\`${content.language}\n${content.value}\n\`\`\`\n\n`;
    } else if ('value' in content) {
      // MarkupContent
      output += content.value + '\n\n';
    }
  }

  return output.trim();
}

/**
 * Format definition locations as markdown for LLM consumption
 */
export function formatDefinitionResult(result: Location | Location[] | LocationLink[] | null): string {
  if (!result) {
    return 'No definition found.';
  }

  const locations = Array.isArray(result) ? result : [result];

  if (locations.length === 0) {
    return 'No definition found.';
  }

  let output = `Found ${locations.length} definition${locations.length !== 1 ? 's' : ''}:\n\n`;

  for (const loc of locations) {
    if ('targetUri' in loc) {
      // LocationLink
      const path = uriToPath(loc.targetUri);
      const range = loc.targetSelectionRange || loc.targetRange;
      output += `- ${path}:${range.start.line + 1}:${range.start.character + 1}\n`;
    } else {
      // Location
      const path = uriToPath(loc.uri);
      output += `- ${path}:${loc.range.start.line + 1}:${loc.range.start.character + 1}\n`;
    }
  }

  return output;
}

/**
 * Format references as markdown for LLM consumption
 */
export function formatReferencesResult(result: Location[] | null): string {
  if (!result || result.length === 0) {
    return 'No references found.';
  }

  let output = `Found ${result.length} reference${result.length !== 1 ? 's' : ''}:\n\n`;

  for (const loc of result) {
    const path = uriToPath(loc.uri);
    output += `- ${path}:${loc.range.start.line + 1}:${loc.range.start.character + 1}\n`;
  }

  return output;
}

/**
 * Format diagnostics as markdown for LLM consumption
 */
export function formatDiagnosticsResult(result: Diagnostic[]): string {
  if (result.length === 0) {
    return 'No diagnostics (errors or warnings) found.';
  }

  const errors = result.filter(d => d.severity === 1);
  const warnings = result.filter(d => d.severity === 2);
  const info = result.filter(d => d.severity === 3);
  const hints = result.filter(d => d.severity === 4);

  let output = `Found ${result.length} diagnostic${result.length !== 1 ? 's' : ''}:\n`;
  output += `- ${errors.length} error${errors.length !== 1 ? 's' : ''}\n`;
  output += `- ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}\n`;
  output += `- ${info.length} info\n`;
  output += `- ${hints.length} hint${hints.length !== 1 ? 's' : ''}\n\n`;

  // Show errors first
  if (errors.length > 0) {
    output += '## Errors\n\n';
    for (const diag of errors) {
      output += formatDiagnostic(diag);
    }
  }

  // Then warnings
  if (warnings.length > 0) {
    output += '## Warnings\n\n';
    for (const diag of warnings) {
      output += formatDiagnostic(diag);
    }
  }

  // Then info/hints if there aren't too many diagnostics
  if (result.length <= 20) {
    if (info.length > 0) {
      output += '## Info\n\n';
      for (const diag of info) {
        output += formatDiagnostic(diag);
      }
    }

    if (hints.length > 0) {
      output += '## Hints\n\n';
      for (const diag of hints) {
        output += formatDiagnostic(diag);
      }
    }
  }

  return output;
}

/**
 * Format a single diagnostic
 */
function formatDiagnostic(diag: Diagnostic): string {
  let output = `**Line ${diag.range.start.line + 1}:${diag.range.start.character + 1}**: ${diag.message}`;

  if (diag.source) {
    output += ` _(${diag.source})_`;
  }

  if (diag.code) {
    output += ` [${diag.code}]`;
  }

  output += '\n\n';

  return output;
}

/**
 * Format workspace edit as markdown for LLM consumption
 */
export function formatWorkspaceEditResult(result: WorkspaceEdit | null): string {
  if (!result) {
    return 'No workspace edit available.';
  }

  let output = 'Workspace edit:\n\n';

  if (result.changes) {
    for (const [uri, edits] of Object.entries(result.changes)) {
      const path = uriToPath(uri);
      output += `### ${path}\n\n`;
      output += `${edits.length} edit${edits.length !== 1 ? 's' : ''}:\n`;

      for (const edit of edits) {
        output += `- Line ${edit.range.start.line + 1}: `;
        if (edit.newText) {
          output += `Replace with: \`${edit.newText}\``;
        } else {
          output += 'Delete';
        }
        output += '\n';
      }

      output += '\n';
    }
  }

  if (result.documentChanges) {
    output += `${result.documentChanges.length} document change${result.documentChanges.length !== 1 ? 's' : ''}\n`;
  }

  return output;
}

/**
 * Format text edits as markdown for LLM consumption
 */
export function formatTextEditsResult(result: TextEdit[] | null, filePath: string): string {
  if (!result || result.length === 0) {
    return 'No edits available.';
  }

  let output = `Applied ${result.length} edit${result.length !== 1 ? 's' : ''} to ${filePath}:\n\n`;

  for (const edit of result) {
    const startLine = edit.range.start.line + 1;
    const endLine = edit.range.end.line + 1;

    if (startLine === endLine) {
      output += `- Line ${startLine}: `;
    } else {
      output += `- Lines ${startLine}-${endLine}: `;
    }

    if (edit.newText) {
      const preview = edit.newText.length > 50
        ? edit.newText.substring(0, 50) + '...'
        : edit.newText;
      output += `Replace with: \`${preview}\``;
    } else {
      output += 'Delete';
    }

    output += '\n';
  }

  return output;
}

/**
 * Format symbols as markdown for LLM consumption
 */
export function formatSymbolsResult(result: SymbolInformation[] | DocumentSymbol[] | null): string {
  if (!result || result.length === 0) {
    return 'No symbols found.';
  }

  let output = `Found ${result.length} symbol${result.length !== 1 ? 's' : ''}:\n\n`;

  for (const symbol of result) {
    if ('location' in symbol) {
      // SymbolInformation
      output += formatSymbolInformation(symbol);
    } else {
      // DocumentSymbol
      output += formatDocumentSymbol(symbol, 0);
    }
  }

  return output;
}

/**
 * Format a SymbolInformation
 */
function formatSymbolInformation(symbol: SymbolInformation): string {
  const kindName = getSymbolKindName(symbol.kind);
  const path = uriToPath(symbol.location.uri);
  const line = symbol.location.range.start.line + 1;

  let output = `- **${symbol.name}** _(${kindName})_`;

  if (symbol.containerName) {
    output += ` in ${symbol.containerName}`;
  }

  output += ` — ${path}:${line}\n`;

  return output;
}

/**
 * Format a DocumentSymbol (hierarchical)
 */
function formatDocumentSymbol(symbol: DocumentSymbol, indent: number): string {
  const kindName = getSymbolKindName(symbol.kind);
  const line = symbol.range.start.line + 1;
  const indentStr = '  '.repeat(indent);

  let output = `${indentStr}- **${symbol.name}** _(${kindName})_ — Line ${line}`;

  if (symbol.detail) {
    output += ` — ${symbol.detail}`;
  }

  output += '\n';

  if (symbol.children) {
    for (const child of symbol.children) {
      output += formatDocumentSymbol(child, indent + 1);
    }
  }

  return output;
}

/**
 * Format code actions as markdown for LLM consumption
 */
export function formatCodeActionsResult(result: (CodeAction | Command)[] | null): string {
  if (!result || result.length === 0) {
    return 'No code actions available.';
  }

  let output = `Found ${result.length} code action${result.length !== 1 ? 's' : ''}:\n\n`;

  for (let i = 0; i < result.length; i++) {
    const item = result[i];

    if ('title' in item && 'kind' in item) {
      // CodeAction
      output += `${i + 1}. **${item.title}**`;
      if (item.kind) {
        output += ` _(${item.kind})_`;
      }
      output += '\n';
    } else if ('title' in item) {
      // Command
      output += `${i + 1}. **${item.title}**\n`;
    }
  }

  return output;
}

/**
 * Get human-readable name for CompletionItemKind
 */
function getCompletionItemKindName(kind: number): string {
  const kinds: Record<number, string> = {
    1: 'Text',
    2: 'Method',
    3: 'Function',
    4: 'Constructor',
    5: 'Field',
    6: 'Variable',
    7: 'Class',
    8: 'Interface',
    9: 'Module',
    10: 'Property',
    11: 'Unit',
    12: 'Value',
    13: 'Enum',
    14: 'Keyword',
    15: 'Snippet',
    16: 'Color',
    17: 'File',
    18: 'Reference',
    19: 'Folder',
    20: 'EnumMember',
    21: 'Constant',
    22: 'Struct',
    23: 'Event',
    24: 'Operator',
    25: 'TypeParameter',
  };

  return kinds[kind] || 'Unknown';
}

/**
 * Get human-readable name for SymbolKind
 */
function getSymbolKindName(kind: number): string {
  const kinds: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  };

  return kinds[kind] || 'Unknown';
}
