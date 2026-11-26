import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { groupPositionedText, normalizeViewportRect, type NormalizedRect } from "./pdf-layout";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfSourceFragment {
  text: string;
  bounds: NormalizedRect | null;
}

export interface PdfSourceLine {
  pageNumber: number;
  lineNumber: number;
  text: string;
  fragments: PdfSourceFragment[];
}

export interface PdfTextExtraction {
  text: string;
  totalPages: number;
  pagesRead: number;
  truncated: boolean;
  lines: PdfSourceLine[];
}

export interface PdfPageRender {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
}

/**
 * Extract selectable PDF text and retain approximate fragment rectangles.
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
    const lines: PdfSourceLine[] = [];
    const documentLines: string[] = [];

    for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      const positionedItems = content.items.flatMap((item) => {
        if (!("str" in item) || typeof item.str !== "string") return [];
        if (!("transform" in item) || !Array.isArray(item.transform) || item.transform.length < 6) return [];

        const x = Number(item.transform[4]);
        const baselineY = Number(item.transform[5]);
        const width = "width" in item ? Number(item.width) : 0;
        const height = "height" in item ? Number(item.height) : 0;

        if (![x, baselineY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
          return [{ text: item.str, x, y: baselineY, width, height, bounds: null }];
        }

        const [a, b, c, d, e, f] = viewport.transform;
        const corners = [
          [x, baselineY - height],
          [x + width, baselineY - height],
          [x, baselineY],
          [x + width, baselineY],
        ].map(([pointX, pointY]) => [
          a * pointX + c * pointY + e,
          b * pointX + d * pointY + f,
        ]);
        const viewportRect: [number, number, number, number] = [
          Math.min(...corners.map((point) => point[0])),
          Math.min(...corners.map((point) => point[1])),
          Math.max(...corners.map((point) => point[0])),
          Math.max(...corners.map((point) => point[1])),
        ];

        return [{
          text: item.str,
          x,
          y: baselineY,
          width,
          height,
          bounds: normalizeViewportRect(viewportRect, viewport.width, viewport.height),
        }];
      });

      const rows = groupPositionedText(positionedItems);
      if (rows.length === 0) continue;

      if (documentLines.length > 0) documentLines.push("", "");
      documentLines.push(`--- Page ${pageNumber} ---`);

      for (const row of rows) {
        const lineNumber = documentLines.length + 1;
        documentLines.push(row.text);
        lines.push({
          pageNumber,
          lineNumber,
          text: row.text,
          fragments: row.fragments.map((fragment) => ({
            text: fragment.text,
            bounds: fragment.bounds ?? null,
          })),
        });
      }
    }

    return {
      text: documentLines.join("\n"),
      totalPages: document.numPages,
      pagesRead,
      truncated: document.numPages > pagesRead,
      lines,
    };
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Render one PDF page to a data URL for a local, canvas-free React preview.
 * The page image remains in browser memory and is never uploaded.
 */
export async function renderPdfPage(
  file: File,
  pageNumber: number,
  maxWidth = 860,
): Promise<PdfPageRender> {
  if (file.type !== "application/pdf") {
    throw new Error("Choose a PDF file to preview.");
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document.numPages) {
      throw new Error("That PDF page is not available.");
    }

    const page = await document.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1.35, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale: Math.max(0.25, scale) });
    const outputScale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = window.document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) throw new Error("This browser could not create a PDF preview surface.");

    canvas.width = Math.ceil(viewport.width * outputScale);
    canvas.height = Math.ceil(viewport.height * outputScale);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
      transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      background: "#ffffff",
    }).promise;

    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: viewport.width,
      height: viewport.height,
      pageCount: document.numPages,
    };
  } finally {
    await loadingTask.destroy();
  }
}
