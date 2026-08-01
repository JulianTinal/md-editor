import { Document, Page, View, Text, Image, StyleSheet, Font, Link } from '@react-pdf/renderer';
import type { Root, RootContent, PhrasingContent, Heading, Paragraph, Blockquote, Code, List, ListItem, Table, TableRow, TableCell, ThematicBreak, Text as MdText, Strong, Emphasis, InlineCode, Link as MdLink, Image as MdImage } from 'mdast';

/** Rasterized Mermaid diagrams, keyed by trimmed source. */
export type DiagramMap = Record<string, { dataUrl: string; ratio: number }>;

// A4 content width in points: 595.28 − 56 × 2 margins.
const CONTENT_WIDTH = 483;

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.55,
    color: '#1a1a1f',
    backgroundColor: '#ffffff',
  },
  h1: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginTop: 0,
    marginBottom: 14,
    color: '#0f0f14',
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginTop: 22,
    marginBottom: 8,
    color: '#1a1a1f',
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 6,
    color: '#1a1a1f',
  },
  h4: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#1a1a1f',
  },
  p: {
    marginBottom: 10,
    color: '#1a1a1f',
  },
  a: {
    color: '#6d28d9',
    textDecoration: 'underline',
  },
  strong: {
    fontFamily: 'Helvetica-Bold',
  },
  em: {
    fontFamily: 'Helvetica-Oblique',
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 10,
    backgroundColor: '#f3f2ec',
    color: '#6d28d9',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  pre: {
    fontFamily: 'Courier',
    fontSize: 9.5,
    backgroundColor: '#f3f2ec',
    color: '#1a1a1f',
    padding: 10,
    marginVertical: 10,
    borderRadius: 4,
  },
  blockquote: {
    marginVertical: 10,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#7c3aed',
    borderLeftStyle: 'solid',
    color: '#4a4a52',
    fontFamily: 'Helvetica-Oblique',
  },
  list: {
    marginBottom: 10,
    paddingLeft: 14,
  },
  listItem: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  listBullet: {
    width: 14,
    color: '#6a6a72',
  },
  listOrdered: {
    width: 14,
    color: '#6a6a72',
    fontFamily: 'Courier',
    fontSize: 10,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#d4d2c8',
    borderStyle: 'solid',
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e0d6',
    borderBottomStyle: 'solid',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0eee7',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    padding: 6,
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e3e0d6',
    borderRightStyle: 'solid',
  },
  tableCellLast: {
    padding: 6,
    flex: 1,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: '#d4d2c8',
    borderBottomStyle: 'solid',
    marginVertical: 18,
  },
  image: {
    marginVertical: 10,
  },
  diagram: {
    marginVertical: 16,
    alignItems: 'center',
  },
  del: {
    color: '#9a9aa4',
    textDecoration: 'line-through',
  },
  taskListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskCheckbox: {
    width: 14,
    fontFamily: 'Courier',
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#9a9aa4',
    borderTopWidth: 1,
    borderTopColor: '#e3e0d6',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
});

interface InlineProps {
  nodes: PhrasingContent[];
  listIndex?: number;
}

function Inline({ nodes, listIndex }: InlineProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <>
      {nodes.map((node, i) => {
        const key = `i-${i}`;
        if (node.type === 'text') {
          const text = node as MdText;
          return <Text key={key}>{text.value}</Text>;
        }
        if (node.type === 'strong') {
          const strong = node as Strong;
          return (
            <Text key={key} style={styles.strong}>
              <Inline nodes={strong.children} />
            </Text>
          );
        }
        if (node.type === 'emphasis') {
          const em = node as Emphasis;
          return (
            <Text key={key} style={styles.em}>
              <Inline nodes={em.children} />
            </Text>
          );
        }
        if (node.type === 'inlineCode') {
          const code = node as InlineCode;
          return (
            <Text key={key} style={styles.code}>
              {code.value}
            </Text>
          );
        }
        if (node.type === 'link') {
          const link = node as MdLink;
          return (
            <Link key={key} src={link.url} style={styles.a}>
              <Inline nodes={link.children} />
            </Link>
          );
        }
        if (node.type === 'break') {
          return <Text key={key}>{'\n'}</Text>;
        }
        if (node.type === 'image') {
          const img = node as MdImage;
          return (
            <Text key={key} style={styles.a}>
              [{img.alt || img.url}]
            </Text>
          );
        }
        if (node.type === 'delete') {
          return (
            <Text key={key} style={styles.del}>
              <Inline nodes={(node as any).children} />
            </Text>
          );
        }
        return null;
      })}
    </>
  );
}

interface BlockProps {
  nodes: RootContent[];
  orderedIndex?: { value: number };
  diagrams?: DiagramMap;
}

function Blocks({ nodes, orderedIndex, diagrams = {} }: BlockProps) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <>
      {nodes.map((node, i) => {
        const key = `b-${i}`;
        if (node.type === 'heading') {
          const h = node as Heading;
          const depth = h.depth;
          const styleKey = `h${depth}` as 'h1' | 'h2' | 'h3' | 'h4';
          return (
            <View key={key} style={styles[styleKey]}>
              <Text>
                <Inline nodes={h.children} />
              </Text>
            </View>
          );
        }
        if (node.type === 'paragraph') {
          const p = node as Paragraph;
          return (
            <View key={key} style={styles.p}>
              <Text>
                <Inline nodes={p.children} />
              </Text>
            </View>
          );
        }
        if (node.type === 'code') {
          const c = node as Code;
          if (c.lang === 'mermaid') {
            const diagram = diagrams[c.value.trim()];
            if (diagram) {
              const width = CONTENT_WIDTH;
              const height = Math.round(width / diagram.ratio);
              return (
                <View key={key} style={styles.diagram} wrap={false}>
                  <Image src={diagram.dataUrl} style={{ width, height }} />
                </View>
              );
            }
          }
          return (
            <View key={key} style={styles.pre} wrap={false}>
              <Text>{c.value}</Text>
            </View>
          );
        }
        if (node.type === 'blockquote') {
          const bq = node as Blockquote;
          return (
            <View key={key} style={styles.blockquote}>
              <Text>
                <Blocks nodes={bq.children as RootContent[]} diagrams={diagrams} />
              </Text>
            </View>
          );
        }
        if (node.type === 'list') {
          const list = node as List;
          const ordered = list.ordered;
          return (
            <View key={key} style={styles.list}>
              {list.children.map((item, j) => {
                const li = item as ListItem;
                const bullet = ordered ? `${list.start ? list.start + j : j + 1}.` : '•';
                const isTask = li.checked !== null && li.checked !== undefined;
                return (
                  <View key={`${key}-li-${j}`} style={isTask ? styles.taskListItem : styles.listItem}>
                    {isTask ? (
                      <Text style={styles.taskCheckbox}>{li.checked ? '[x]' : '[ ]'}</Text>
                    ) : (
                      <Text style={ordered ? styles.listOrdered : styles.listBullet}>{bullet}</Text>
                    )}
                    <Text style={{ flex: 1 }}>
                      <Blocks nodes={li.children as RootContent[]} diagrams={diagrams} />
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }
        if (node.type === 'table') {
          const table = node as Table;
          const rows = table.children as TableRow[];
          return (
            <View key={key} style={styles.table} wrap={false}>
              {rows.map((row, ri) => {
                const isLast = ri === rows.length - 1;
                const cells = row.children as TableCell[];
                return (
                  <View key={`${key}-r-${ri}`} style={isLast ? styles.tableRowLast : styles.tableRow} wrap={false}>
                    {cells.map((cell, ci) => {
                      const isLastCell = ci === cells.length - 1;
                      const isHeader = row.children[ci] && (row.children[ci] as any).type === 'tableCell' && table.align && table.align[ci] !== null;
                      return (
                        <View
                          key={`${key}-c-${ci}`}
                          style={isLastCell ? styles.tableCellLast : styles.tableCell}
                        >
                          <Text style={isHeader ? styles.tableHeader : {}}>
                            <Inline nodes={cell.children as PhrasingContent[]} />
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        }
        if (node.type === 'thematicBreak') {
          return <View key={key} style={styles.hr} />;
        }
        if (node.type === 'html') {
          return null;
        }
        return null;
      })}
    </>
  );
}

interface MarkdownPdfProps {
  content: string;
  ast: Root;
  filename: string;
  diagrams?: DiagramMap;
}

export function MarkdownPdf({ ast, filename, diagrams = {} }: MarkdownPdfProps) {
  return (
    <Document
      title={filename}
      author="MD Editor"
      creator="MD Editor"
      producer="MD Editor · @react-pdf/renderer"
    >
      <Page size="A4" style={styles.page} wrap>
        <Blocks nodes={ast.children as RootContent[]} diagrams={diagrams} />
        <View style={styles.footer} fixed>
          <Text>{filename}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
