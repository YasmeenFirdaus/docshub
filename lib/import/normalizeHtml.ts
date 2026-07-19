import * as cheerio from "cheerio";

const WRAPPER_TAGS = new Set(["div", "span", "font"]);
const PRESERVE_TAGS_ARR = [
  "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "pre", "code", "img", "a", "ul", "ol", "li", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
];
const PRESERVE_SELECTOR = PRESERVE_TAGS_ARR.join(",");

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
  const keys = Object.keys(attrs).filter((k: string) => k !== "style" && k !== "class");
  return keys.length === 0;
}

function removeWordNoise($: cheerio.CheerioAPI) {
  $("[style]").each((_: number, el: any) => {
    const $el = $(el);
    const style = ($el.attr("style") ?? "").toLowerCase();
    if (style.includes("mso-") || style.includes("tab-stops") || style.includes("font-family:") || style.includes("color:")) {
      $el.removeAttr("style");
    }
  });
  $("[class]").each((_: number, el: any) => {
    const $el = $(el);
    const cls = ($el.attr("class") ?? "").toLowerCase();
    if (cls.includes("mso") || cls.includes("wordsection")) {
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
    if (!text && !hasImage && !hasTable) $el.remove();
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
  $("td > p, th > p").each((_: number, p: any) => {
    const $p = $(p);
    const text = $p.text().replace(/\u00a0/g, " ").trim();
    if (!text && $p.find("img").length === 0) { $p.remove(); return; }
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
    const prev = $br.prev();
    const next = $br.next();
    if (!prev.length || !next.length) $br.remove();
  });
}

function normalizeLinksAndImages($: cheerio.CheerioAPI) {
  $("a").each((_: number, a: any) => {
    const $a = $(a);
    const href = ($a.attr("href") ?? "").trim();
    if (!href) { $a.replaceWith($a.contents()); return; }
    $a.removeAttr("style");
  });
  $("img").each((_: number, img: any) => {
    const $img = $(img);
    const src = ($img.attr("src") ?? "").trim();
    if (!src) { $img.remove(); return; }
    $img.removeAttr("style");
  });
}

export function normalizeHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script,noscript,style").remove();
  $.root().contents().filter((_: number, node: any) => node.type === "comment").remove();

  removeWordNoise($);
  normalizeLinksAndImages($);
  unwrapSafeWrappers($);
  normalizeLists($);
  normalizeTables($);
  normalizeCallouts($);
  normalizeInlineBreaks($);
  normalizeEmptyBlocks($);

  $("p,div,span").each((_: number, el: any) => {
    const $el = $(el);
    if ($el.closest("table,thead,tbody,tfoot,tr,td,th,pre,code").length > 0) return;
    const text = $el.text().replace(/\u00a0/g, " ").trim();
    if (!text && $el.find("img,table").length === 0) $el.remove();
  });

  return $.html().replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n");
}
