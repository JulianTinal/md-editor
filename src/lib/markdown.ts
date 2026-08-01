import { unified, type Root } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

/**
 * Rehype step: turn `<pre><code class="language-mermaid">…</code></pre>` into
 * `<pre class="mermaid" data-mermaid-source>…</pre>` so the raw diagram source
 * survives sanitization and the preview can hand it to Mermaid for rendering.
 */
function rehypeMermaid() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (!node || !Array.isArray(node.children)) return;
      node.children = node.children.map((child: any) => {
        if (child?.type === 'element' && child.tagName === 'pre') {
          const code = child.children?.find(
            (c: any) => c.type === 'element' && c.tagName === 'code'
          );
          const classes = code?.properties?.className;
          const isMermaid = Array.isArray(classes) && classes.includes('language-mermaid');
          if (isMermaid) {
            const source = (code.children || [])
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.value)
              .join('');
            return {
              type: 'element',
              tagName: 'pre',
              properties: { className: ['mermaid'] },
              children: [{ type: 'text', value: source }],
            };
          }
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

// Sanitization schema, extended so common README-style HTML survives:
// the mermaid marker, inline images/badges, and `align` for centering.
// Sanitization still strips scripts, event handlers and unsafe protocols.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'picture', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'align'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    img: [...(defaultSchema.attributes?.img ?? []), 'width', 'height', 'align', 'loading'],
    source: ['srcset', 'media', 'type', 'sizes'],
    div: [...(defaultSchema.attributes?.div ?? []), 'align'],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeMermaid)
  .use(rehypeSanitize, schema)
  .use(rehypeStringify);

const astProcessor = unified().use(remarkParse).use(remarkGfm);

export function markdownToHtml(markdown: string): string {
  const result = processor.processSync(markdown);
  return String(result.value);
}

export function markdownToAst(markdown: string): Root {
  return astProcessor.parse(markdown) as Root;
}
