import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Everything reads from --cm-* CSS variables, which the active theme
// (.mdc-app[data-theme]) sets. Switching themes is then pure CSS: no view
// re-creation, and the syntax colors update live.
const cmTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--cm-bg)',
    color: 'var(--cm-text)',
  },
  '.cm-scroller': {
    fontFamily:
      '"JetBrains Mono", ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
    lineHeight: '1.7',
    fontSize: '13.5px',
  },
  '.cm-content': {
    padding: '1.5rem 1.75rem',
    caretColor: 'var(--cm-caret)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--cm-caret)',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': { backgroundColor: 'var(--cm-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-gutters': { border: 'none', display: 'none' },
  '.cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--cm-selection) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--cm-selection) !important',
  },
  '.cm-selectionMatch': { backgroundColor: 'var(--cm-active)' },
  '.cm-matchingBracket': {
    color: 'var(--cm-heading)',
    backgroundColor: 'var(--cm-active)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  '.cm-searchMatch': { backgroundColor: 'var(--cm-selection)' },
});

const cmHighlight = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--cm-heading)', fontWeight: '700' },
  { tag: tags.heading2, color: 'var(--cm-heading)', fontWeight: '700' },
  { tag: tags.heading3, color: 'var(--cm-heading)', fontWeight: '600' },
  { tag: tags.heading, color: 'var(--cm-heading)', fontWeight: '600' },
  { tag: tags.strong, color: 'var(--cm-strong)', fontWeight: '700' },
  { tag: tags.emphasis, color: 'var(--cm-emphasis)', fontStyle: 'italic' },
  { tag: tags.link, color: 'var(--cm-link)' },
  { tag: tags.url, color: 'var(--cm-link)', textDecoration: 'underline' },
  { tag: tags.monospace, color: 'var(--cm-code)' },
  { tag: tags.quote, color: 'var(--cm-quote)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--cm-punct)' },
  // The #, **, -, > and other markdown markers — kept clearly visible.
  { tag: tags.processingInstruction, color: 'var(--cm-punct)', fontWeight: '600' },
  { tag: tags.meta, color: 'var(--cm-punct)' },
  { tag: tags.string, color: 'var(--cm-text)' },
  { tag: tags.atom, color: 'var(--cm-link)' },
]);

export default function EditorPane({ value, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  valueRef.current = value;

  // Create the editor exactly once. Theme changes are handled by CSS.
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      doc: valueRef.current,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        cmTheme,
        syntaxHighlighting(cmHighlight),
      ],
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Reflect external value changes (e.g. reset) without disturbing the caret.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentValue = view.state.doc.toString();
    if (value !== currentValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full overflow-hidden" />;
}
