import type { ObservationCandidate } from "./candidate-extraction";
import type { PdfSourceLine } from "./pdf";

function normalizeSourceText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Attach PDF geometry only when both the page/line position and the
 * normalized visible text still match the extracted source. The editable
 * text panel can change a line, so positional matching alone is unsafe.
 */
export function attachPdfSourceBounds(
  candidates: ObservationCandidate[],
  sourceLines: PdfSourceLine[],
): ObservationCandidate[] {
  const linesBySource = new Map(
    sourceLines.map((line) => [`${line.pageNumber}:${line.lineNumber}`, line]),
  );

  return candidates.map((candidate) => {
    const sourceLine = linesBySource.get(`${candidate.page}:${candidate.line}`);
    const textMatches = sourceLine
      && normalizeSourceText(candidate.rawLine) === normalizeSourceText(sourceLine.text);
    const sourceBounds = textMatches
      ? sourceLine.fragments.flatMap((fragment) => fragment.bounds ? [fragment.bounds] : [])
      : [];

    return { ...candidate, sourceBounds };
  });
}
