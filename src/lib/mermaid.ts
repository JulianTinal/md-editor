/**
 * Shared Mermaid helpers. Mermaid is a heavy dependency (~2 MB), so it is
 * only ever imported dynamically — the base editor never pays for it until a
 * document actually contains a diagram.
 */

type MermaidTheme = 'dark' | 'light';

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
let initializedTheme: MermaidTheme | null = null;

async function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

/**
 * Loads Mermaid and (re)initializes it for the requested theme. `securityLevel`
 * is 'strict' so pasted diagram source can never inject scripts or click
 * handlers into the page.
 */
export async function ensureMermaid(theme: MermaidTheme) {
  const mermaid = await loadMermaid();
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme === 'light' ? 'default' : 'dark',
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      // Pure-SVG labels (no <foreignObject>): required so the diagram can be
      // rasterized to PNG for the PDF without tainting the canvas.
      htmlLabels: false,
      flowchart: { htmlLabels: false, useMaxWidth: true },
    });
    initializedTheme = theme;
  }
  return mermaid;
}

let idCounter = 0;
export function nextMermaidId() {
  idCounter += 1;
  return `mmd-${idCounter}`;
}

/** Collects the source of every ```mermaid fenced block, in document order. */
export function extractMermaidSources(markdown: string): string[] {
  const sources: string[] = [];
  const fence = /(^|\n)([ \t]*)(`{3,}|~{3,})[ \t]*mermaid[^\n]*\n([\s\S]*?)\n[ \t]*\3/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(markdown)) !== null) {
    sources.push(match[4]);
  }
  return sources;
}

/** Ensures the SVG root carries explicit width/height so it rasterizes reliably. */
function withExplicitSize(svg: string): { svg: string; ratio: number } {
  const vb = svg.match(/viewBox="([\d.\-\s]+)"/);
  let w = 0;
  let h = 0;
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(Number);
    w = parts[2];
    h = parts[3];
  }
  const ratio = w && h ? w / h : 1.5;
  const sized = svg.replace(
    /<svg\b([^>]*?)>/,
    (full, attrs: string) => {
      const cleaned = attrs
        .replace(/\swidth="[^"]*"/, '')
        .replace(/\sheight="[^"]*"/, '')
        .replace(/style="[^"]*"/, '');
      const dims = w && h ? ` width="${w}" height="${h}"` : '';
      return `<svg${cleaned}${dims}>`;
    }
  );
  return { svg: sized, ratio };
}

/**
 * Rasterizes a Mermaid SVG to a white-backed PNG data URL for embedding in the
 * PDF (react-pdf cannot render arbitrary SVG). Browser-only.
 */
export async function svgToPng(
  svg: string,
  targetWidth = 1600
): Promise<{ dataUrl: string; ratio: number }> {
  const { svg: sized, ratio } = withExplicitSize(svg);
  const width = targetWidth;
  const height = Math.round(width / ratio);

  const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.width = width;
    img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo cargar el SVG del diagrama'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return { dataUrl: canvas.toDataURL('image/png'), ratio };
  } finally {
    URL.revokeObjectURL(url);
  }
}
