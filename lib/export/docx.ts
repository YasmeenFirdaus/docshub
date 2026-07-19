import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

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

function getText(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(getText).join("");
  if (typeof value === "object") {
    return (
      value.text ?? value.content ?? value.value ?? value.plainText ??
      value.label ?? value.attrs?.text ?? value.attrs?.content ?? ""
    ).toString();
  }
  return String(value);
}

function hasMark(node: any, markName: string): boolean {
  const marks = node?.marks ?? node?.attrs?.marks ?? node?.styles ?? [];
  if (!Array.isArray(marks)) return false;
  return marks.some((m: any) => {
    if (!m) return false;
    if (typeof m === "string") return m.toLowerCase() === markName.toLowerCase();
    return String(m.type ?? m.name ?? m.mark ?? "").toLowerCase() === markName.toLowerCase();
  });
}

function getHref(node: any): string | null {
  return (
    node?.href ?? node?.url ?? node?.attrs?.href ?? node?.attrs?.url ??
    node?.marks?.find?.((m: any) => String(m?.type ?? "").toLowerCase() === "link")?.attrs?.href ??
    null
  );
}

function inlineToRuns(node: any): (TextRun | ExternalHyperlink)[] {
  if (node == null) return [];
  if (typeof node === "string") return [new TextRun(node)];
  if (Array.isArray(node)) return node.flatMap(inlineToRuns);

  const text = getText(node);
  if (!text) return [];

  const href = getHref(node);
  const run = new TextRun({
    text,
    bold: hasMark(node, "bold"),
    italics: hasMark(node, "italic") || hasMark(node, "em"),
    underline: hasMark(node, "underline") ? {} : undefined,
    strike: hasMark(node, "strike") || hasMark(node, "strikethrough"),
    font: hasMark(node, "code") ? "Courier New" : undefined,
    size: hasMark(node, "code") ? 18 : undefined,
    color: href ? "0563C1" : undefined,
  });

  if (href) {
    return [new ExternalHyperlink({ link: href, children: [run] })];
  }
  return [run];
}

function flattenInlineText(node: any): string {
  return getText(node).replace(/\s+/g, " ").trim();
}

function tableFromBlock(block: AnyBlock): Table {
  const rowsSource = block.rows ?? block.content?.rows ?? block.content ?? block.children ?? [];
  const rows: any[] = Array.isArray(rowsSource) ? rowsSource : [];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row: any) => {
      const cellsSource = row.cells ?? row.content ?? row.children ?? row.columns ?? [];
      const cells: any[] = Array.isArray(cellsSource) ? cellsSource : [];
      return new TableRow({
        children: cells.map((cell: any) => {
          const cellText = flattenInlineText(cell);
          return new TableCell({
            children: [new Paragraph({ children: cellText ? inlineToRuns(cellText) : [new TextRun(" ")] })],
          });
        }),
      });
    }),
  });
}

function hlevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5,
  };
  return map[level] ?? HeadingLevel.HEADING_6;
}

async function blockToDocxNodes(block: AnyBlock, listIndex = 1): Promise<Array<Paragraph | Table>> {
  const type = getType(block);
  const text = flattenInlineText(block.content ?? block.text ?? block.children ?? "");

  if (type === "heading" || type === "header") {
    const level = Number(block.attrs?.level ?? block.props?.level ?? 1);
    return [new Paragraph({ heading: hlevel(level), children: inlineToRuns(block.content ?? block.text ?? text) })];
  }

  if (type === "paragraph" || type === "text") {
    return [new Paragraph({ children: inlineToRuns(block.content ?? block.text ?? text) })];
  }

  if (type === "blockquote" || type === "quote" || type === "callout") {
    const label = String(block.attrs?.callout ?? block.props?.callout ?? "").toLowerCase();
    const prefix = label ? `${label.toUpperCase()}: ` : "NOTE: ";
    return [new Paragraph({
      indent: { left: 720 },
      children: [new TextRun({ text: prefix, bold: true }), ...inlineToRuns(block.content ?? block.text ?? text)],
    })];
  }

  if (type === "bulletlistitem" || type === "bullet_list_item" || type === "listitem") {
    return [new Paragraph({ text: `• ${text}`, indent: { left: 720 } })];
  }

  if (type === "numberedlistitem" || type === "numbered_list_item") {
    return [new Paragraph({ text: `${listIndex}. ${text}`, indent: { left: 720 } })];
  }

  if (type === "code" || type === "codeblock" || type === "code_block") {
    return [new Paragraph({ children: [new TextRun({ text, font: "Courier New", size: 18 })] })];
  }

  if (type === "divider" || type === "horizontalrule" || type === "hr") {
    return [new Paragraph({ text: "— — —" })];
  }

  if (type === "table") {
    return [tableFromBlock(block)];
  }

  // image: skip binary embedding in DOCX to avoid Buffer type issues; output placeholder text
  if (type === "image") {
    const src = block.src ?? block.url ?? block.attrs?.src ?? block.attrs?.url;
    return [new Paragraph({ text: src ? `[Image: ${src.substring(0, 60)}...]` : "[Image]" })];
  }

  if (type === "link") {
    const href = block.attrs?.href ?? block.url ?? "";
    return [new Paragraph({
      children: [new ExternalHyperlink({
        link: href,
        children: [new TextRun({ text: text || href, color: "0563C1", underline: {} })],
      })],
    })];
  }

  // Fallback
  return [new Paragraph({ children: inlineToRuns(text || JSON.stringify(block)) })];
}

async function blocksToDocxChildren(blocks: AnyBlock[]): Promise<Array<Paragraph | Table>> {
  const out: Array<Paragraph | Table> = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const type = getType(block);
    out.push(...await blockToDocxNodes(block, i + 1));
    if (Array.isArray(block.children) && block.children.length > 0 && type !== "table") {
      out.push(...await blocksToDocxChildren(block.children));
    }
  }
  return out;
}

export async function exportToDocx(blocks: AnyBlock[], title: string): Promise<Buffer> {
  const children = await blocksToDocxChildren(blocks);
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] }),
        ...children,
      ],
    }],
  });
  return Packer.toBuffer(doc) as Promise<Buffer>;
}
