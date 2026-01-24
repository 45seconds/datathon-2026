import { promises as fs } from 'fs';
import path from 'path';

interface JupyterCell {
  cell_type: 'markdown' | 'code' | 'raw';
  source: string[];
  outputs?: JupyterOutput[];
}

interface JupyterOutput {
  output_type: string;
  text?: string[];
  data?: {
    'text/plain'?: string[];
    'text/html'?: string[];
  };
}

interface JupyterNotebook {
  cells: JupyterCell[];
}

export interface ParsedCell {
  type: 'markdown' | 'code' | 'output';
  content: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(markdown: string): string {
  // Basic markdown conversion (headers, bold, italic, code, links)
  let html = escapeHtml(markdown);
  
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');
  
  // Line breaks to paragraphs
  html = html.split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
  
  // List items
  html = html.replace(/<p>- (.+?)<\/p>/g, '<li>$1</li>');
  html = html.replace(new RegExp('(<li>.*</li>)', 'gs'), '<ul>$1</ul>');
  
  return html;
}

export async function parseNotebook(notebookPath: string): Promise<ParsedCell[]> {
  const fullPath = path.join(process.cwd(), '..', notebookPath);
  const content = await fs.readFile(fullPath, 'utf-8');
  const notebook: JupyterNotebook = JSON.parse(content);
  
  const cells: ParsedCell[] = [];
  
  for (const cell of notebook.cells) {
    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    
    if (cell.cell_type === 'markdown') {
      cells.push({
        type: 'markdown',
        content: markdownToHtml(source),
      });
    } else if (cell.cell_type === 'code') {
      cells.push({
        type: 'code',
        content: source,
      });
      
      // Add outputs if present
      if (cell.outputs && cell.outputs.length > 0) {
        for (const output of cell.outputs) {
          let outputText = '';
          
          if (output.text) {
            outputText = Array.isArray(output.text) ? output.text.join('') : output.text;
          } else if (output.data?.['text/plain']) {
            const plain = output.data['text/plain'];
            outputText = Array.isArray(plain) ? plain.join('') : plain;
          }
          
          if (outputText.trim()) {
            cells.push({
              type: 'output',
              content: outputText,
            });
          }
        }
      }
    }
  }
  
  return cells;
}

export async function getNotebookMetadata(notebookPath: string): Promise<{ title: string; description: string }> {
  const cells = await parseNotebook(notebookPath);
  
  // Extract title from first markdown cell
  const firstMarkdown = cells.find(c => c.type === 'markdown');
  let title = 'Notebook';
  let description = '';
  
  if (firstMarkdown) {
    const match = firstMarkdown.content.match(/<h1>(.+?)<\/h1>/);
    if (match) {
      title = match[1];
    }
    
    const descMatch = firstMarkdown.content.match(/<p><strong>Goal<\/strong>:(.+?)<\/p>/);
    if (descMatch) {
      description = descMatch[1].trim();
    }
  }
  
  return { title, description };
}
