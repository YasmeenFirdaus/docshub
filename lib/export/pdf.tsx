import React from "react";
import {
  Document as PdfDocument,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

type AnyBlock = {
  type?: string;
  text?: string;
  content?: any;
  children?: AnyBlock[];
  attrs?: Record<string, any>;
  props?: Record<string, any>;
  rows?: any[];
  cells?: any[];
  src?: string;
  url?: string;
};

function getType(block: AnyBlock): string {
  return String(block?.type ?? block?.attrs?.type ?? block?.props?.type ?? "paragraph").toLowerCase();
}

function flattenText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenText).join("");
  if (typeof value === "object") {
    return (
      value.text ?? value.content ?? value.value ?? value.plainText ??
      value.label ?? value.attrs?.text ?? value.attrs?.content ?? ""
    ).toString();
  }
  return String(value);
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.5, color: "#0f172a" },
  title: { fontSize: 22, marginBottom: 14, fontWeight: 700 },
  h1: { fontSize: 18, marginTop: 12, marginBottom: 6, fontWeight: 700 },
  h2: { fontSize: 15, marginTop: 10, marginBottom: 5, fontWeight: 700 },
  h3: { fontSize: 13, marginTop: 8, marginBottom: 4, fontWeight: 700 },
  p: { marginBottom: 6 },
  listItem: { marginBottom: 3, paddingLeft: 10 },
  callout: {
    marginTop: 6, marginBottom: 8, padding: 8,
    borderLeftWidth: 3, borderLeftColor: "#cbd5e1", backgroundColor: "#f8fafc",
  },
  code: {
    fontFamily: "Courier", fontSize: 10, padding: 8, marginBottom: 8,
    backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0",
  },
  table: { width: "100%", borderWidth: 1, borderColor: "#cbd5e1", marginTop: 6, marginBottom: 8 },
  row: { flexDirection: "row" },
  cell: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#cbd5e1", borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  image: { marginTop: 6, marginBottom: 8, maxWidth: "100%" },
} as any);

function tableRows(block: AnyBlock): any[] {
  const rowsSource = block.rows ?? block.content?.rows ?? block.content ?? block.children ?? [];
  return Array.isArray(rowsSource) ? rowsSource : [];
}

function tableCells(row: any): any[] {
  const cellsSource = row.cells ?? row.content ?? row.children ?? row.columns ?? [];
  return Array.isArray(cellsSource) ? cellsSource : [];
}

function blockToPdfNode(block: AnyBlock, index = 0): React.ReactNode[] {
  const type = getType(block);
  const text = flattenText(block.content ?? block.text ?? block.children ?? "");
  const out: React.ReactNode[] = [];

  if (type === "heading" || type === "header") {
    const level = Number(block.attrs?.level ?? block.props?.level ?? 1);
    const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
    out.push(<Text key={`h-${index}`} style={style}>{text}</Text>);
    return out;
  }

  if (type === "paragraph" || type === "text") {
    out.push(<Text key={`p-${index}`} style={styles.p}>{text}</Text>);
    return out;
  }

  if (type === "blockquote" || type === "quote" || type === "callout") {
    const label = String(block.attrs?.callout ?? block.props?.callout ?? "").toUpperCase();
    out.push(
      <View key={`callout-${index}`} style={styles.callout}>
        <Text>{label ? `${label}: ${text}` : text}</Text>
      </View>
    );
    return out;
  }

  if (type === "bulletlistitem" || type === "bullet_list_item" || type === "listitem") {
    out.push(<Text key={`b-${index}`} style={styles.listItem}>• {text}</Text>);
    return out;
  }

  if (type === "numberedlistitem" || type === "numbered_list_item") {
    out.push(<Text key={`n-${index}`} style={styles.listItem}>{index + 1}. {text}</Text>);
    return out;
  }

  if (type === "code" || type === "codeblock" || type === "code_block") {
    out.push(<Text key={`c-${index}`} style={styles.code}>{text}</Text>);
    return out;
  }

  if (type === "divider" || type === "horizontalrule" || type === "hr") {
    out.push(<Text key={`d-${index}`} style={styles.p}>— — —</Text>);
    return out;
  }

  if (type === "image") {
    const src = block.src ?? block.url ?? block.attrs?.src ?? block.attrs?.url;
    if (src) out.push(<Image key={`img-${index}`} style={styles.image} src={src} />);
    return out;
  }

  if (type === "table") {
    const rows = tableRows(block);
    out.push(
      <View key={`t-${index}`} style={styles.table}>
        {rows.map((row: any, rowIndex: number) => (
          <View key={`tr-${rowIndex}`} style={styles.row}>
            {tableCells(row).map((cell: any, cellIndex: number) => (
              <View key={`td-${cellIndex}`} style={styles.cell}>
                <Text>{flattenText(cell) || " "}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
    return out;
  }

  // Fallback
  out.push(<Text key={`f-${index}`} style={styles.p}>{text || JSON.stringify(block)}</Text>);
  return out;
}

function blocksToPdfNodes(blocks: AnyBlock[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  blocks.forEach((block, index) => {
    out.push(...blockToPdfNode(block, index));
    if (Array.isArray(block.children) && block.children.length > 0) {
      out.push(...blocksToPdfNodes(block.children));
    }
  });
  return out;
}

function PdfDoc({ title, blocks }: { title: string; blocks: AnyBlock[] }) {
  return (
    <PdfDocument>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {blocksToPdfNodes(blocks)}
      </Page>
    </PdfDocument>
  );
}

export async function exportToPdf(blocks: AnyBlock[], title: string): Promise<Buffer> {
  return renderToBuffer(<PdfDoc title={title} blocks={blocks} />) as Promise<Buffer>;
}
