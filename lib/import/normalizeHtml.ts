import * as cheerio from "cheerio";
import fs from "fs";
import { extractDirectFormatting } from "./extractDirectFormatting";

const WRAPPER_TAGS = new Set(["div", "span", "font"]);
const PRESERVE_TAGS_ARR = [
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "pre", "code", "img", "a", "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
];
const PRESERVE_SELECTOR = PRESERVE_TAGS_ARR.join(",");

const ALLOWED_STYLE_PROPS = new Set([
  "font-weight", "font-style", "text-decoration", "text-align",
  "color", "background-color", "vertical-align",
  "font-size", "font-family", // added for direct formatting pass
]);

function sanitizeStyle(styleAttr: string): string {
  return styleAttr
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .filter(rule => {
      const prop = rule.split(":")[0]?.trim().toLowerCase();
      return prop && ALLOWED_STYLE_PROPS.has(prop);
    })
    .join("; ");
}

function detectCallout(text: string): string | null {
  const match = /^(note|important|tip|warning|caution)\s*[:\-]\s*/i.exec(text);
  return match?.[1].toLowerCase() ?? null;
}

function shouldUnwrapWrapper(el: any, $: cheerio.CheerioAPI) {
  const tag = el.tagName?.toLowerCase();
  if (!tag || !WRAPPER_TAGS.has(tag)) return false;
  const $el = $(el);
  if ($el.attr("href") || $el.attr("src") || $el.attr("data-callout")) return false;
  if ($el.find(PRESERVE_SELECTOR).length > 0) return false;
  
  const attrs = el.attribs ?? {};
  const keys = Object.keys(attrs).filter((k: string) => k !== "style" && k !== "class" && k !== "id");
  
  const hasClass = !!$el.attr("class");
  const hasStyle = !!$el.attr("style");
  const hasId = !!$el.attr("id");
  
  if (keys.length === 0 && !hasClass && !hasStyle && !hasId) {
    return true;
  }
  return false;
}

function removeWordNoise($: cheerio.CheerioAPI) {
  $("[style]").each((_: number, el: any) => {
    const $el = $(el);
    const style = $el.attr("style");
    if (style) {
      const sanitized = sanitizeStyle(style);
      if (sanitized) {
        $el.attr("style", sanitized);
      } else {
        $el.removeAttr("style");
      }
    }
  });
  $("[class]").each((_: number, el: any) => {
    const $el = $(el);
    const cls = $el.attr("class") ?? "";
    const newCls = cls
      .split(" ")
      .filter((c: string) => !c.toLowerCase().includes("mso") && !c.toLowerCase().includes("wordsection"))
      .join(" ");
    if (newCls) {
      $el.attr("class", newCls);
    } else {
      $el.removeAttr("class");
    }
  });
}

function unwrapSafeWrappers($: cheerio.CheerioAPI) {
  $("span, font, div").each((_: number, el: any) => {
    if (!shouldUnwrapWrapper(el, $)) return;
    const $el = $(el);
    $el.replaceWith($el.contents());
  });
}

function normalizeEmptyBlocks($: cheerio.CheerioAPI) {
  $("p, div").each((_: number, el: any) => {
    const $el = $(el);
    if ($el.closest("table, thead, tbody, tfoot, tr, td, th, pre, code").length > 0) return;
    
    const text = $el.text().replace(/\u00a0/g, " ").trim();
    const hasImage = $el.find("img").length > 0;
    const hasTable = $el.find("table").length > 0;
    
    if (!text && !hasImage && !hasTable && $el.children().length === 0) {
      const prev = $el.prev();
      if (prev.length > 0 && prev[0].tagName === el.tagName) {
        const prevText = prev.text().replace(/\u00a0/g, " ").trim();
        const prevHasImage = prev.find("img").length > 0;
        const prevHasTable = prev.find("table").length > 0;
        if (!prevText && !prevHasImage && !prevHasTable && prev.children().length === 0) {
          $el.remove();
        }
      }
    }
  });
}

function normalizeLists($: cheerio.CheerioAPI) {
  $("li > p").each((_: number, p: any) => {
    const $p = $(p);
    const text = $p.text().replace(/\u00a0/g, " ").trim();
    if (!text && $p.find("img").length === 0) { $p.remove(); return; }
    $p.replaceWith($p.contents());
  });
  $("li").each((_: number, li: any) => {
    const $li = $(li);
    const text = $li.text().replace(/\u00a0/g, " ").trim();
    if (!text && $li.find("img,table").length === 0) $li.remove();
  });
  $("ul, ol").each((_: number, list: any) => {
    const $list = $(list);
    if ($list.children("li").length === 0) $list.remove();
  });
}

function normalizeTables($: cheerio.CheerioAPI) {
  // Code block detection
  function isCodeBlockCell($cell: cheerio.Cheerio<any>): boolean {
    const paragraphs = $cell.find("p").toArray();
    if (paragraphs.length < 2) return false;
    return paragraphs.every(p => {
      const fontFamily = $(p).css("font-family") ?? "";
      return /courier|consolas|monospace/i.test(fontFamily);
    });
  }

  $("table").each((_, table) => {
    const $table = $(table);
    const $cells = $table.find("td, th");
    if ($cells.length === 1) {
      const $cell = $cells.first();
      if (isCodeBlockCell($cell)) {
        const lines = $cell.find("p").toArray().map(p => $(p).text());
        $table.replaceWith(`<pre><code>${lines.join("\n")}</code></pre>`);
      }
    }
  });

  function flattenListsInCells($api: cheerio.CheerioAPI) {
    $api("td, th").each((_: number, cell: any) => {
      const $cell = $api(cell);
      $cell.find("ul, ol").each((__: number, list: any) => {
        const $list = $api(list);
        const isOrdered = list.tagName?.toLowerCase() === "ol";
        const items = $list.find("> li").toArray().map((li, i) => {
          const marker = isOrdered ? `${i + 1}.` : "•";
          return `${marker} ${$api(li).text().replace(/\u00a0/g, " ").trim()}`;
        });
        $list.replaceWith(items.join("<br/>"));
      });
    });
  }
  
  flattenListsInCells($);

  $("td > p, th > p").each((_: number, p: any) => {
    const $p = $(p);
    const text = $p.text().replace(/\u00a0/g, " ").trim();
    if (!text && $p.find("img").length === 0) { $p.remove(); return; }
    
    // Add line breaks if it's not the last child
    const isLast = $p.is(":last-child");
    if (!isLast) {
      $p.append("<br/>");
    }
    $p.replaceWith($p.contents());
  });

  $("td, th").each((_: number, cell: any) => {
    const $cell = $(cell);
    const text = $cell.text().replace(/\u00a0/g, " ").trim();
    const hasImage = $cell.find("img").length > 0;
    if (!text && !hasImage) $cell.html("&nbsp;");
  });
}

function normalizeCallouts($: cheerio.CheerioAPI) {
  $("p, div").each((_: number, el: any) => {
    const $el = $(el);
    if ($el.closest("table, thead, tbody, tfoot, tr, td, th, pre, code").length > 0) return;
    const text = $el.text().replace(/\u00a0/g, " ").trim();
    const callout = detectCallout(text);
    if (callout) {
      $el.attr("data-callout", callout);
      $el.addClass(`callout callout-${callout}`);
    }
  });
}

function normalizeInlineBreaks($: cheerio.CheerioAPI) {
  $("br").each((_: number, br: any) => {
    const $br = $(br);
    if ($br.prev().length > 0 && $br.prev()[0].tagName === 'br') {
      $br.remove();
    }
  });
}

function normalizeLinksAndImages($: cheerio.CheerioAPI) {
  $("a").each((_: number, a: any) => {
    const $a = $(a);
    const href = ($a.attr("href") ?? "").trim();
    if (!href) { $a.replaceWith($a.contents()); return; }
  });
  $("img").each((_: number, img: any) => {
    const $img = $(img);
    const src = ($img.attr("src") ?? "").trim();
    if (!src) { $img.remove(); return; }
  });
}

function normalizeHeadings($: cheerio.CheerioAPI) {
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const HEADING_LEVEL_MAP: Record<string, number> = {
      h1: 1, h2: 2, h3: 3, h4: 3, h5: 3, h6: 3,
    };
    const tag = el.tagName.toLowerCase();
    const level = HEADING_LEVEL_MAP[tag] ?? 2;
    el.tagName = `h${level}`;
  });
}

async function mergeDirectFormatting($: cheerio.CheerioAPI, fileBuffer?: Buffer) {
  if (!fileBuffer) return;
  const directFormatting = await extractDirectFormatting(fileBuffer);
  
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  const paragraphs = $("p, h1, h2, h3, h4, h5, h6").toArray();
  
  let dfIdx = 0;
  for (const para of paragraphs) {
    const $el = $(para);
    const htmlText = normalize($el.text());

    let matchIdx = -1;
    for (let i = dfIdx; i < Math.min(dfIdx + 25, directFormatting.length); i++) {
      if (directFormatting[i].text === htmlText && htmlText.length > 0) {
        matchIdx = i;
        break;
      }
    }
    
    const df = matchIdx >= 0 ? directFormatting[matchIdx] : directFormatting[dfIdx];
    if (!df) continue;

    dfIdx = (matchIdx >= 0 ? matchIdx : dfIdx) + 1;
    
    if (df.alignment) $el.css("text-align", df.alignment);
    if (df.indentTwips) {
      const indentPx = Math.round(df.indentTwips / 1440 * 96); // twips → px @ 96dpi
      $el.css("margin-left", `${indentPx}px`);
    }
    
    const parentTd = $el.closest("td");
    if (parentTd.length > 0 && df.cellShading) {
      parentTd.css("background-color", `#${df.cellShading}`);
    }

    if (df.runs.length > 0) {
      const hasColor = df.runs.some(r => r.color);
      const hasSize = df.runs.some(r => r.fontSize);
      const hasMono = df.runs.some(r => r.monospace);
      
      if (df.runs.length === 1 || (hasColor && df.runs.every(r => r.color === df.runs[0].color))) {
        if (df.runs[0].color) $el.css("color", `#${df.runs[0].color}`);
      }
      if (df.runs.length === 1 || (hasSize && df.runs.every(r => r.fontSize === df.runs[0].fontSize))) {
        if (df.runs[0].fontSize) $el.css("font-size", `${df.runs[0].fontSize! / 2}pt`);
      }
      if (df.runs.length === 1 || (hasMono && df.runs.every(r => r.monospace === df.runs[0].monospace))) {
        if (df.runs[0].monospace) $el.css("font-family", "monospace");
      }
    }
  }
}

export async function normalizeHtml(html: string, fileBuffer?: Buffer): Promise<string> {
  const $ = cheerio.load(html);

  if (process.env.DEBUG_NORMALIZE === "1") {
    try {
      fs.writeFileSync("/tmp/before_normalize.html", html, "utf8");
    } catch (e) {}
  }

  $("script,noscript,style").remove();
  $.root().contents().filter((_: number, node: any) => node.type === "comment").remove();

  // Root Cause 1: Direct Formatting
  await mergeDirectFormatting($, fileBuffer);

  removeWordNoise($);
  normalizeLinksAndImages($);
  unwrapSafeWrappers($);
  
  // Root Cause 2: Heading Level Map
  normalizeHeadings($);
  
  normalizeLists($);
  
  // Root Cause 3: Table cell breaks & code blocks
  normalizeTables($);
  
  normalizeCallouts($);
  normalizeInlineBreaks($);
  normalizeEmptyBlocks($);

  const result = $.html().replace(/\u00a0/g, " ");

  if (process.env.DEBUG_NORMALIZE === "1") {
    try {
      fs.writeFileSync("/tmp/after_normalize.html", result, "utf8");
    } catch (e) {}
  }

  return result;
}
