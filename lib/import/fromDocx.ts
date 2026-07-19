import mammoth from "mammoth";
import { normalizeHtml } from "./normalizeHtml";

export type HtmlToBlocks = (html: string) => Promise<any[]> | any[];

type ImportDocxResult = {
  normalizedHtml: string;
  blocks: any[];
};

export async function importDocxToBlocks(
  fileBuffer: Buffer,
  htmlToBlocks: HtmlToBlocks
): Promise<ImportDocxResult> {
  // convertToHtml with image conversion to base64 data URIs
  const result = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.imgElement(async (image) => {
        const imageBuffer = await image.read("base64");
        return { src: `data:${image.contentType};base64,${imageBuffer}` };
      }),
    }
  );

  const normalizedHtml = normalizeHtml(result.value);
  const blocks = await Promise.resolve(htmlToBlocks(normalizedHtml));

  return { normalizedHtml, blocks };
}
