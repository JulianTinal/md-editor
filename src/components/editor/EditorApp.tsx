import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import EditorPane from './EditorPane';
import PreviewPane from './PreviewPane';
import { markdownToHtml } from '@/lib/markdown';
import { exportPdf } from '@/lib/exportPdf';
import { exportDocx } from '@/lib/exportDocx';
import { THEMES, DEFAULT_THEME, resolveTheme, isDarkTheme } from '@/lib/themes';

const DEFAULT_MD = `# Empieza a escribir

Escribe tu contenido en **Markdown** y mira la
vista previa en vivo a la derecha.

## Formato básico

Puedes usar **negritas**, *cursivas*, ~~tachado~~,
y \`código en línea\`.

### Listas

- Elemento uno
- Elemento dos
- Elemento tres

### Tareas

- [x] Editor con resaltado
- [x] Vista previa en vivo
- [x] Exportar a PDF
- [x] Exportar a Word

### Código

\`\`\`javascript
function saludar(nombre) {
  return \`Hola, \${nombre}!\`;
}
\`\`\`

### Tablas

| Característica | Soporte |
|---------------|:-------:|
| Negritas      |   ✅    |
| Cursivas      |   ✅    |
| Tablas        |   ✅    |
| Código        |   ✅    |

### Diagramas

También puedes incluir diagramas con \`mermaid\`:

\`\`\`mermaid
flowchart LR
  A[Escribe Markdown] --> B{¿Exportar?}
  B -->|PDF| C[Documento A4]
  B -->|Word| D[Archivo .docx]
\`\`\`

### Cita

> Markdown es un lenguaje de marcado ligero
> creado por John Gruber y Aaron Swartz.

---

**Empieza a escribir** en el panel izquierdo.
`;

const STORAGE_KEY_SPLIT = 'mdc-split';
const STORAGE_KEY_SYNC = 'mdc-sync';
const STORAGE_KEY_CONTENT = 'mdc-content';
const STORAGE_KEY_FILENAME = 'mdc-filename';

function getInitialContent(): string {
  if (typeof window === 'undefined') return DEFAULT_MD;
  const stored = window.localStorage.getItem(STORAGE_KEY_CONTENT);
  return stored ?? DEFAULT_MD;
}

function getInitialFilename(): string {
  if (typeof window === 'undefined') return 'untitled.md';
  return window.localStorage.getItem(STORAGE_KEY_FILENAME) || 'untitled.md';
}

function getInitialSplit(): number {
  if (typeof window === 'undefined') return 50;
  const stored = window.localStorage.getItem(STORAGE_KEY_SPLIT);
  if (stored) {
    const parsed = parseFloat(stored);
    if (parsed >= 20 && parsed <= 80) return parsed;
  }
  return 50;
}

function getInitialSync(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY_SYNC);
  return stored === null ? true : stored === 'true';
}

function getInitialTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  return resolveTheme(window.localStorage.getItem('mdc-theme'));
}

export default function EditorApp() {
  const [content, setContent] = useState(getInitialContent);
  const [filename, setFilename] = useState(getInitialFilename);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [theme, setTheme] = useState<string>(getInitialTheme);
  const [exportOpen, setExportOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null);

  const [split, setSplit] = useState<number>(getInitialSplit);
  const [syncScroll, setSyncScroll] = useState<boolean>(getInitialSync);

  const isDark = isDarkTheme(theme);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => markdownToHtml(content), [content]);
  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content]
  );
  const charCount = useMemo(() => content.length, [content]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('mdc-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!exportOpen && !themeOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exportRef.current && !exportRef.current.contains(target)) {
        setExportOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(target)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportOpen, themeOpen]);

  // Persist the document so a reload keeps what the user wrote (debounced).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY_CONTENT, content);
    }, 400);
    return () => window.clearTimeout(id);
  }, [content]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_FILENAME, filename);
  }, [filename]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_SPLIT, String(split));
  }, [split]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_SYNC, String(syncScroll));
  }, [syncScroll]);

  const selectTheme = useCallback((id: string) => {
    setTheme(id);
    setThemeOpen(false);
  }, []);

  const handleExportPdf = useCallback(async () => {
    setExportOpen(false);
    setExporting('pdf');
    try {
      await exportPdf(content, filename);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setExporting(null);
    }
  }, [content, filename]);

  const handleExportDocx = useCallback(async () => {
    setExportOpen(false);
    setExporting('docx');
    try {
      await exportDocx(content, filename);
    } catch (err) {
      console.error('Error al exportar DOCX:', err);
    } finally {
      setExporting(null);
    }
  }, [content, filename]);

  const handleEditorScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingRef.current) return;
    const src = e.currentTarget;
    const dst = previewScrollRef.current;
    if (!dst) return;
    const max = src.scrollHeight - src.clientHeight;
    if (max <= 0) return;
    const ratio = src.scrollTop / max;
    isSyncingRef.current = true;
    const dstMax = dst.scrollHeight - dst.clientHeight;
    dst.scrollTop = ratio * dstMax;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [syncScroll]);

  const handlePreviewScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingRef.current) return;
    const src = e.currentTarget;
    const dst = editorScrollRef.current;
    if (!dst) return;
    const max = src.scrollHeight - src.clientHeight;
    if (max <= 0) return;
    const ratio = src.scrollTop / max;
    isSyncingRef.current = true;
    const dstMax = dst.scrollHeight - dst.clientHeight;
    dst.scrollTop = ratio * dstMax;
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [syncScroll]);

  const beginDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const pct = Math.min(80, Math.max(20, (x / rect.width) * 100));
      setSplit(pct);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const resetSplit = useCallback(() => setSplit(50), []);

  return (
    <div
      className="mdc-app flex h-full flex-col bg-(--color-bg-base)"
      data-theme={theme}
      data-mode={isDark ? 'dark' : 'light'}
    >
      <div className="no-print flex h-[52px] shrink-0 items-center justify-between border-b border-(--color-border-faint) bg-(--color-bg-soft) px-3 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="/"
            className="flex items-center transition-opacity hover:opacity-80"
            title="Volver al inicio"
            aria-label="MD Editor — inicio"
          >
            <img src="/img-logo.svg" alt="MD Editor" className="ds-editor-logo h-6 w-auto" width="94" height="24" />
          </a>
          <span className="hidden text-(--color-text-dim) sm:inline">/</span>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-24 border-none bg-transparent font-mono text-[12.5px] text-(--color-text-secondary) outline-none focus:text-(--color-text-primary) sm:w-44"
            aria-label="Filename"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 font-mono text-[11px] text-(--color-text-tertiary) sm:flex">
            <span>{wordCount}W</span>
            <span className="text-(--color-text-dim)">·</span>
            <span>{charCount}C</span>
          </div>

          <div className="flex overflow-hidden rounded-lg border border-(--color-border) sm:hidden">
            <button
              onClick={() => setMobileTab('edit')}
              className={`px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-tight transition-colors ${
                mobileTab === 'edit'
                  ? 'bg-(--color-accent) text-white'
                  : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
              }`}
            >
              MD
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-tight transition-colors ${
                mobileTab === 'preview'
                  ? 'bg-(--color-accent) text-white'
                  : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
              }`}
            >
              Vista
            </button>
          </div>

          <button
            onClick={() => setSyncScroll((v) => !v)}
            className={`flex h-7 items-center gap-1.5 px-2 font-mono text-[10.5px] uppercase tracking-tight transition-colors ${
              syncScroll
                ? 'text-(--color-accent)'
                : 'text-(--color-text-tertiary) hover:text-(--color-text-primary)'
            }`}
            aria-label="Sincronizar scroll"
            aria-pressed={syncScroll}
            title={syncScroll ? 'Sincronización activada' : 'Sincronización desactivada'}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25h6m-3-3l3 3-3 3M21 15.75h-6m3 3l-3-3 3-3" />
            </svg>
            <span className="hidden sm:inline">Sync</span>
          </button>

          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-(--color-text-secondary) transition-colors hover:bg-(--color-bg-surface) hover:text-(--color-text-primary)"
              aria-label="Elegir tema"
              aria-haspopup="menu"
              aria-expanded={themeOpen}
              title="Tema"
            >
              <span
                className="block h-4 w-4 rounded-full ring-1 ring-(--color-border-strong)"
                style={{ backgroundColor: THEMES.find((t) => t.id === theme)?.swatch }}
              ></span>
            </button>
            {themeOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) py-1 shadow-2xl"
                role="menu"
              >
                <div className="border-b border-(--color-border-faint) px-3.5 pb-1.5 pt-1.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-(--color-text-tertiary)">
                    Tema
                  </span>
                </div>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    role="menuitemradio"
                    aria-checked={theme === t.id}
                    onClick={() => selectTheme(t.id)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-(--color-bg-surface)"
                  >
                    <span
                      className="block h-4 w-4 shrink-0 rounded-full ring-1 ring-(--color-border-strong)"
                      style={{ backgroundColor: t.swatch }}
                    ></span>
                    <span className="flex-1 text-[13.5px] text-(--color-text-primary)">{t.label}</span>
                    <span className="w-4 text-(--color-accent-bright)" aria-hidden="true">
                      {theme === t.id ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting !== null}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-(--color-accent) px-3.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-(--color-accent-bright) hover:text-(--color-bg-inset) disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <span className="signal-dot inline-block h-1.5 w-1.5 rounded-full bg-white"></span>
                  <span>Generando…</span>
                </>
              ) : (
                <>
                  <span>Exportar</span>
                  <span className="text-[9px]">▾</span>
                </>
              )}
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-bg-elevated) shadow-2xl">
                <div className="border-b border-(--color-border-faint) px-3.5 pb-2 pt-3">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-(--color-text-tertiary)">
                    Exportar documento
                  </span>
                </div>

                <button
                  onMouseDown={handleExportPdf}
                  className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-(--color-bg-surface)"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-accent-bg) text-(--color-accent-bright)">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-(--color-text-primary)">
                      Descargar PDF
                    </span>
                    <span className="block text-[12px] text-(--color-text-tertiary)">
                      Documento A4, tipografía cuidada
                    </span>
                  </span>
                  <span className="text-(--color-text-dim) transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    &rarr;
                  </span>
                </button>

                <button
                  onMouseDown={handleExportDocx}
                  className="group flex w-full items-center gap-3 border-t border-(--color-border-faint) px-3 py-3 text-left transition-colors hover:bg-(--color-bg-surface)"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--color-signal)/15 text-(--color-signal)">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M8 13l1.5 4 1.5-3 1.5 3L14 13" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-(--color-text-primary)">
                      Descargar Word
                    </span>
                    <span className="block text-[12px] text-(--color-text-tertiary)">
                      Archivo .docx editable
                    </span>
                  </span>
                  <span className="text-(--color-text-dim) transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    &rarr;
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 overflow-hidden"
      >
        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden border-r border-(--color-border-faint) ${
            mobileTab === 'edit' ? 'block' : 'hidden sm:flex'
          }`}
          style={{ width: mobileTab === 'edit' ? '100%' : `${split}%`, flex: mobileTab === 'edit' ? '1 1 100%' : '0 0 auto' }}
        >
          <div
            className="flex-1 overflow-hidden"
            ref={(el) => { editorScrollRef.current = el; }}
            onScroll={handleEditorScroll}
          >
            <EditorPane value={content} onChange={setContent} />
          </div>
        </div>

        <div
          className="hidden sm:flex"
          onMouseDown={beginDrag}
          onDoubleClick={resetSplit}
          style={{ width: 6, cursor: 'col-resize', flex: '0 0 6px', background: 'transparent' }}
          title="Arrastrar para redimensionar · Doble click para 50/50"
        >
          <div
            className="m-auto h-full w-px"
            style={{ background: 'var(--color-border)' }}
          />
        </div>

        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden bg-(--color-bg-base) ${
            mobileTab === 'preview' ? 'block' : 'hidden sm:flex'
          }`}
          style={{ width: mobileTab === 'preview' ? '100%' : `${100 - split}%`, flex: '0 0 auto' }}
        >
          <div
            className="flex-1 overflow-hidden"
            ref={(el) => { previewScrollRef.current = el; }}
            onScroll={handlePreviewScroll}
          >
            <PreviewPane html={html} isDark={isDark} />
          </div>
        </div>
      </div>

      <div className="no-print flex h-6 shrink-0 items-center justify-between border-t border-(--color-border-faint) bg-(--color-bg-soft) px-3 font-mono text-[10.5px] tracking-tight text-(--color-text-tertiary) sm:px-4">
        <span className="flex items-center gap-3">
          <span>UTF-8</span>
          <span className="text-(--color-text-dim)">·</span>
          <span>MARKDOWN</span>
        </span>
        <span className="flex items-center gap-3">
          <span>{Math.round(split)}%</span>
          <span className="text-(--color-text-dim)">·</span>
          <span>{syncScroll ? 'SYNC ON' : 'SYNC OFF'}</span>
        </span>
        <span className="hidden items-center gap-3 sm:flex">
          <span>CLIENT-SIDE</span>
          <span className="text-(--color-text-dim)">·</span>
          <span>SIN RASTREO</span>
        </span>
      </div>
    </div>
  );
}
