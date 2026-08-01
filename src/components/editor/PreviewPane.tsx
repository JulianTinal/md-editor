import { useEffect, useRef } from 'react';
import { ensureMermaid, nextMermaidId } from '@/lib/mermaid';

interface Props {
  html: string;
  isDark: boolean;
}

// Rendered SVG cached by theme + source, so re-applying a diagram after a
// theme switch or a React re-render is instant and never flickers.
const svgCache = new Map<string, string>();

export default function PreviewPane({ html, isDark }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const theme: 'dark' | 'light' = isDark ? 'dark' : 'light';
    let cancelled = false;
    let timer = 0;

    // Render every mermaid block that is not yet showing its diagram. This is
    // driven by a MutationObserver, so it re-runs whenever the blocks appear
    // for ANY reason — first load, an edit, or React re-applying the preview
    // HTML on a theme switch — which is what kept diagrams from disappearing.
    const renderPending = async () => {
      if (cancelled) return;
      const blocks = Array.from(
        root.querySelectorAll<HTMLPreElement>('pre.mermaid:not(.mermaid-rendered)')
      );
      if (blocks.length === 0) return;

      // Instant, flicker-free pass for anything already cached for this theme.
      const pending: HTMLPreElement[] = [];
      for (const block of blocks) {
        const source = (block.getAttribute('data-source') ?? block.textContent ?? '').trim();
        if (!source) continue;
        block.setAttribute('data-source', source);
        const cached = svgCache.get(`${theme}\n${source}`);
        if (cached) {
          block.innerHTML = cached;
          block.classList.add('mermaid-rendered');
          block.classList.remove('mermaid-error');
        } else {
          pending.push(block);
        }
      }
      if (pending.length === 0) return;

      let mermaid;
      try {
        mermaid = await ensureMermaid(theme);
      } catch {
        return;
      }
      if (cancelled) return;

      for (const block of pending) {
        if (cancelled) return;
        if (block.classList.contains('mermaid-rendered')) continue;
        const source = block.getAttribute('data-source') ?? '';
        if (!source) continue;
        try {
          const { svg } = await mermaid.render(nextMermaidId(), source);
          if (cancelled) return;
          svgCache.set(`${theme}\n${source}`, svg);
          block.innerHTML = svg;
          block.classList.add('mermaid-rendered');
          block.classList.remove('mermaid-error');
        } catch (err) {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : 'Diagrama inválido';
          block.classList.add('mermaid-error');
          block.classList.remove('mermaid-rendered');
          block.innerHTML = '';
          const note = document.createElement('div');
          note.className = 'mermaid-error-note';
          note.textContent = `⚠ No se pudo renderizar el diagrama: ${message.split('\n')[0]}`;
          const code = document.createElement('pre');
          code.className = 'mermaid-error-code';
          code.textContent = source;
          block.appendChild(note);
          block.appendChild(code);
        }
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(renderPending, 120);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
    // The observer catches html changes on its own; we only re-create it when
    // the theme flips (to render diagrams with the new mermaid theme).
  }, [isDark]);

  return (
    <div className="h-full overflow-y-auto bg-(--color-bg-surface)">
      <div className="w-full px-8 py-8 sm:px-12 sm:py-12 lg:px-16">
        <div
          ref={rootRef}
          className="prose"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
