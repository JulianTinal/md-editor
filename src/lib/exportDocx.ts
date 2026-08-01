import { markdownToAst } from './markdown';

/**
 * Markdown → Word (.docx), built on the `docx` library. We walk the Markdown
 * AST ourselves and map every node to a real Word element (heading styles,
 * bold/italic/strike, inline code, links, ordered/unordered lists, blockquotes,
 * code blocks, tables and rules) — so the output opens cleanly and stays
 * editable in Word. `docx` is loaded dynamically to keep it out of the base
 * bundle until an export actually happens.
 */
export async function exportDocx(content: string, filename: string): Promise<void> {
  const docx = await import('docx');
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ExternalHyperlink,
    HeadingLevel,
    LevelFormat,
    AlignmentType,
    BorderStyle,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = docx;

  const ast = markdownToAst(content) as any;

  const MONO = 'Courier New';
  const CODE_FILL = 'F1F0F5';
  const ORDERED_REF = 'md-ordered';
  let orderedInstance = 0; // a fresh instance per ordered list restarts numbering

  type Fmt = { bold?: boolean; italics?: boolean; strike?: boolean; link?: boolean };

  const runProps = (fmt: Fmt) => ({
    bold: fmt.bold,
    italics: fmt.italics,
    strike: fmt.strike,
    ...(fmt.link ? { style: 'Hyperlink' } : {}),
  });

  // Phrasing content → an array of TextRun / ExternalHyperlink.
  function inline(nodes: any[], fmt: Fmt = {}): any[] {
    if (!nodes) return [];
    const out: any[] = [];
    for (const node of nodes) {
      switch (node.type) {
        case 'text':
          out.push(new TextRun({ text: node.value, ...runProps(fmt) }));
          break;
        case 'strong':
          out.push(...inline(node.children, { ...fmt, bold: true }));
          break;
        case 'emphasis':
          out.push(...inline(node.children, { ...fmt, italics: true }));
          break;
        case 'delete':
          out.push(...inline(node.children, { ...fmt, strike: true }));
          break;
        case 'inlineCode':
          out.push(
            new TextRun({
              text: node.value,
              font: MONO,
              shading: { fill: CODE_FILL },
              ...runProps(fmt),
            })
          );
          break;
        case 'break':
          out.push(new TextRun({ break: 1 }));
          break;
        case 'link': {
          const children = node.children?.length
            ? inline(node.children, { ...fmt, link: true })
            : [new TextRun({ text: node.url, style: 'Hyperlink' })];
          out.push(new ExternalHyperlink({ link: node.url, children }));
          break;
        }
        case 'image':
          out.push(new TextRun({ text: `[${node.alt || node.url}]`, italics: true }));
          break;
        default:
          if (node.children) out.push(...inline(node.children, fmt));
      }
    }
    return out;
  }

  const HEADINGS = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  function listItems(list: any, depth = 0): any[] {
    const paras: any[] = [];
    const ordered = !!list.ordered;
    const instance = ordered ? orderedInstance++ : 0;
    for (const item of list.children) {
      const isTask = item.checked === true || item.checked === false;
      // The item's first block holds the inline content; deeper blocks recurse.
      for (let i = 0; i < item.children.length; i++) {
        const block = item.children[i];
        if (block.type === 'list') {
          paras.push(...listItems(block, depth + 1));
          continue;
        }
        const runs =
          block.type === 'paragraph' || block.type === 'heading'
            ? inline(block.children)
            : [new TextRun({ text: toText(block) })];
        if (i === 0) {
          const prefix = isTask
            ? [new TextRun({ text: item.checked ? '☑ ' : '☐ ' })]
            : [];
          paras.push(
            new Paragraph({
              children: [...prefix, ...runs],
              ...(isTask
                ? { indent: { left: 360 * (depth + 1) } }
                : ordered
                  ? { numbering: { reference: ORDERED_REF, level: depth, instance } }
                  : { bullet: { level: depth } }),
            })
          );
        } else {
          paras.push(new Paragraph({ children: runs, indent: { left: 360 * (depth + 1) } }));
        }
      }
    }
    return paras;
  }

  function toText(node: any): string {
    if (node.value) return node.value;
    if (node.children) return node.children.map(toText).join('');
    return '';
  }

  function tableOf(node: any): any {
    const rows: any[] = node.children.map((row: any, ri: number) => {
      const cells = row.children.map(
        (cell: any) =>
          new TableCell({
            children: [new Paragraph({ children: inline(cell.children) })],
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
          })
      );
      return new TableRow({ children: cells, tableHeader: ri === 0 });
    });
    return new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  }

  function codeBlock(node: any): any {
    const lines = String(node.value).split('\n');
    const children: any[] = [];
    lines.forEach((line, i) => {
      if (i > 0) children.push(new TextRun({ break: 1 }));
      children.push(new TextRun({ text: line, font: MONO, size: 19 }));
    });
    return new Paragraph({
      children,
      shading: { fill: CODE_FILL },
      spacing: { before: 120, after: 120 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1EA' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1EA' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1EA' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'E3E1EA' },
      },
    });
  }

  // Block-level nodes → docx elements.
  function blocks(nodes: any[]): any[] {
    const out: any[] = [];
    for (const node of nodes) {
      switch (node.type) {
        case 'heading':
          out.push(
            new Paragraph({
              heading: HEADINGS[Math.min(node.depth, 6) - 1],
              children: inline(node.children),
            })
          );
          break;
        case 'paragraph':
          out.push(new Paragraph({ children: inline(node.children) }));
          break;
        case 'list':
          out.push(...listItems(node));
          break;
        case 'blockquote':
          for (const child of node.children) {
            out.push(
              new Paragraph({
                children:
                  child.type === 'paragraph'
                    ? inline(child.children, { italics: true })
                    : [new TextRun({ text: toText(child), italics: true })],
                indent: { left: 360 },
                border: {
                  left: { style: BorderStyle.SINGLE, size: 18, color: '7C3AED', space: 12 },
                },
              })
            );
          }
          break;
        case 'code':
          out.push(codeBlock(node));
          break;
        case 'table':
          out.push(tableOf(node));
          out.push(new Paragraph({ text: '' }));
          break;
        case 'thematicBreak':
          out.push(
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCACF' } },
              spacing: { before: 120, after: 120 },
            })
          );
          break;
        default:
          break;
      }
    }
    return out;
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: ORDERED_REF,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 360 * (level + 1), hanging: 260 } } },
          })),
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{ children: blocks(ast.children) }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = filename.replace(/\.md$/, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'document';
  a.download = `${cleanName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
