import type { ObservationCandidate } from "./candidate-extraction";
import type { PdfSourceLine } from "./pdf";

export function attachPdfSourceBounds(
  candidates: ObservationCandidate[],
  sourceLines: PdfSourceLine[],
): ObservationCandidate[] {
  const linesBySource = new Map(
    sourceLines.map((line) => [`${line.pageNumber}:${line.lineNumber}`, line]),
  );

  return candidates.map((candidate) => {
    const sourceLine = linesBySource.get(`${candidate.page}:${candidate.line}`);
    const sourceBounds = sourceLine?.fragments.flatMap((fragment) =>
      fragment.bounds ? [fragment.bounds] : [],
    ) ?? [];

    return { ...candidate, sourceBounds };
  });
}
