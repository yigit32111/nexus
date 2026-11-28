export const PDF_PAGE_LIMIT = 50;

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Uint8Array.from(buffer), isEvalSupported: false });
  try {
    const { text } = await parser.getText({ first: PDF_PAGE_LIMIT, pageJoiner: "\n\n" });
    return text.trim();
  } finally {
    await parser.destroy();
  }
}
