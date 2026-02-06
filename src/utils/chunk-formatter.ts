import { SemanticChunk } from '../tools/semantic-chunking.js';

/**
 * Formats a semantic chunk for LLM consumption.
 * Wraps the chunk in XML tags and reconstructs the hierarchical context.
 * 
 * @param chunk The semantic chunk to format
 * @param filePath Optional file path context
 * @returns Formatted string for LLM prompt
 */
export function formatChunkForLLM(chunk: SemanticChunk, filePath?: string): string {
    const parts: string[] = [];

    // Open tag with metadata
    const fileAttr = filePath ? ` file="${filePath}"` : '';
    parts.push(`<chunk name="${chunk.name}" type="${chunk.kind}"${fileAttr}>`);

    // Hierarchy / Context
    if (chunk.hierarchy && chunk.hierarchy.length > 0) {
        parts.push('  <hierarchy>');
        // Indent hierarchy lines to simulate structure
        chunk.hierarchy.forEach((line, index) => {
            const indent = '  '.repeat(index + 2); // Start at 2 spaces + indentation
            parts.push(`${indent}${line}`);
        });
        parts.push('  </hierarchy>');
    }

    // Content
    parts.push('  <content>');
    // Indent content slightly or keep as is? 
    // Usually keeping as is is better for exactness, but indentation looks nicer.
    // Let's just wrap it cleanly.
    parts.push(chunk.content);
    parts.push('  </content>');

    // Close tag
    parts.push('</chunk>');

    return parts.join('\n');
}
