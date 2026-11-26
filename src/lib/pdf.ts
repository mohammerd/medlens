import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { groupPositionedText } from "./pdf-layout";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    const pagesRead = Math.min(document.numPages, maxPages);
    const pageSections: string[] = [];

    for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const positionedItems = content.items.flatMap((item) => {
        if (!("str" in item) || typeof item.str !== "string") return [];
        if (!("transform" in item) || !Array.isArray(item.transform) || item.transform.length < 6) return [];

        return [{
          text: item.str,
          x: Number(item.transform[4]),
          y: Number(item.transform[5]),
        }];
      });

      const normalized = groupPositionedText(positionedItems)
        .map((row) => row.text)
        .join("\n")
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
    await loadingTask.destroy();
  }
}
