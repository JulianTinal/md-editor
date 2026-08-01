import { pdf } from '@react-pdf/renderer';
import { markdownToAst } from './markdown';
import { MarkdownPdf, type DiagramMap } from './pdfDocument';
import {
  ensureMermaid,
  extractMermaidSources,
  nextMermaidId,
  svgToPng,
} from './mermaid';

/**
 * Pre-renders every Mermaid diagram to a white-backed PNG so it can be embedded
 * in the PDF. Diagrams are rendered with the light theme to read well on paper.
 * A diagram that fails to render is simply omitted from the map, and the PDF
 * falls back to showing its source as a code block.
 */
async function renderDiagrams(markdown: string): Promise<DiagramMap> {
  const sources = extractMermaidSources(markdown);
  const map: DiagramMap = {};
  if (sources.length === 0) return map;

  let mermaid;
  try {
    mermaid = await ensureMermaid('light');
  } catch {
    return map;
  }

  for (const source of sources) {
    const key = source.trim();
    if (map[key]) continue;
    try {
      const { svg } = await mermaid.render(nextMermaidId(), key);
      const { dataUrl, ratio } = await svgToPng(svg);
      map[key] = { dataUrl, ratio };
    } catch {
      // leave unmapped → PDF renders the source as a code block
    }
  }
  return map;
}

export async function exportPdf(content: string, filename: string): Promise<void> {
  const ast = markdownToAst(content);
  const diagrams = await renderDiagrams(content);
  const blob = await pdf(
    <MarkdownPdf content={content} ast={ast} filename={filename} diagrams={diagrams} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename.replace(/\.md$/, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'document';
  a.download = `${cleanName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
