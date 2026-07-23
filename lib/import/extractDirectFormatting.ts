import JSZip from "jszip";
import * as cheerio from "cheerio";

export interface RunFormatting {
  color?: string;      // hex, from w:color
  fontSize?: number;   // half-points, from w:sz
  monospace?: boolean; // true if rFonts is Courier New / similar
  bold?: boolean;
  italic?: boolean;
  shading?: string;    // cell background
}

export interface ParagraphFormatting {
  alignment?: "left" | "center" | "right" | "justify"; // from w:jc
  indentTwips?: number; // from w:ind
  runs: RunFormatting[];
  cellShading?: string;
  text: string;
}

export async function extractDirectFormatting(docxBuffer: Buffer): Promise<ParagraphFormatting[]> {
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXmlFile = zip.file("word/document.xml");
    if (!documentXmlFile) return [];

    const xmlString = await documentXmlFile.async("string");
    
    // Parse using cheerio with xmlMode enabled
    const $ = cheerio.load(xmlString, { xmlMode: true });

    const paragraphs: ParagraphFormatting[] = [];

    $("w\\:p").each((_, p) => {
      const $p = $(p);
      const paraFormat: ParagraphFormatting = { runs: [], text: "" };

      // Paragraph alignment
      const $jc = $p.children("w\\:pPr").children("w\\:jc");
      if ($jc.length > 0) {
        const val = $jc.attr("w:val");
        if (val === "left" || val === "center" || val === "right" || val === "both" || val === "justify") {
          paraFormat.alignment = val === "both" ? "justify" : val as any;
        }
      }

      // Paragraph indentation
      const $ind = $p.children("w\\:pPr").children("w\\:ind");
      if ($ind.length > 0) {
        const left = $ind.attr("w:left") ?? $ind.attr("w:start");
        if (left) paraFormat.indentTwips = parseInt(left, 10);
      }

      // Cell shading (w:shd) is actually in w:tcPr, which is a parent of w:p if inside a table cell.
      // So let's look up to w:tc > w:tcPr > w:shd
      const $tc = $p.closest("w\\:tc");
      if ($tc.length > 0) {
        const $shd = $tc.children("w\\:tcPr").children("w\\:shd");
        if ($shd.length > 0) {
          const fill = $shd.attr("w:fill");
          if (fill && fill !== "auto") {
            paraFormat.cellShading = fill;
          }
        }
      }

      // Runs formatting
      $p.children("w\\:r").each((__, r) => {
        const $r = $(r);
        const runFormat: RunFormatting = {};
        
        const $rPr = $r.children("w\\:rPr");
        if ($rPr.length > 0) {
          const $color = $rPr.children("w\\:color");
          if ($color.length > 0) {
            const val = $color.attr("w:val");
            if (val && val !== "auto") runFormat.color = val;
          }

          const $sz = $rPr.children("w\\:sz");
          if ($sz.length > 0) {
            const val = $sz.attr("w:val");
            if (val) runFormat.fontSize = parseInt(val, 10);
          }

          const $fonts = $rPr.children("w\\:rFonts");
          if ($fonts.length > 0) {
            const ascii = $fonts.attr("w:ascii")?.toLowerCase() || "";
            const hAnsi = $fonts.attr("w:hAnsi")?.toLowerCase() || "";
            if (ascii.includes("courier") || ascii.includes("consolas") || ascii.includes("monospace") ||
                hAnsi.includes("courier") || hAnsi.includes("consolas") || hAnsi.includes("monospace")) {
              runFormat.monospace = true;
            }
          }

          if ($rPr.children("w\\:b").length > 0) runFormat.bold = true;
          if ($rPr.children("w\\:i").length > 0) runFormat.italic = true;
        }
        
        // Add run only if there is text in this run
        if ($r.find("w\\:t").length > 0) {
          paraFormat.runs.push(runFormat);
        }
      });

      const rawText = $p.find("w\\:t").text();
      paraFormat.text = rawText.replace(/\s+/g, " ").trim();

      paragraphs.push(paraFormat);
    });

    return paragraphs;
  } catch (error) {
    console.error("extractDirectFormatting failed:", error);
    return [];
  }
}
