import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export interface PdfTextExtraction {
  text: string;
  totalPages: number;
  pagesRead: number;
  truncated: boolean;
}

/**
 * Extracts the selectable text layer from a PDF entirely in the browser.
 * This is not OCR: image-only/scanned pages can return no text.
 */
export async function extractPdfText(
  file: File,
  maxPages = 50,
): Promise<PdfTextExtraction> {
  if (file.type !== "application/pdf") {
    throw new Error("Choose a PDF file to use text extraction.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
  }).promise;

  try {
    const pagesRead = Math.min(document.numPages, maxPages);
    const pageSections: string[] = [];

    for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";

      for (const item of content.items) {
        if (!("str" in item) || typeof item.str !== "string") continue;
        pageText += item.str;
        pageText += "hasEOL" in item && item.hasEOL ? "\n" : " ";
      }

      const normalized = pageText
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();

      if (normalized) {
        pageSections.push(`--- Page ${pageNumber} ---\n${normalized}`);
      }
    }

    return {
      text: pageSections.join("\n\n"),
      totalPages: document.numPages,
      pagesRead,
      truncated: document.numPages > pagesRead,
    };
  } finally {
    await document.destroy();
  }
}
