import type { ObservationCandidate } from "./candidate-extraction";
import type { PdfTextExtraction } from "./pdf";

export interface ReviewRowReference {
  id: string;
  testName: string;
  page: number;
  line: number;
}

export interface ReviewConflict {
  key: string;
  testKey: string;
  testName: string;
  page: number;
  values: string[];
}

export interface ReviewSummary {
  candidateCount: number;
  confirmedCount: number;
  pendingCount: number;
  missingUnitRows: ReviewRowReference[];
  missingReferenceIntervalRows: ReviewRowReference[];
  missingSourceHighlightRows: ReviewRowReference[];
  potentialConflicts: ReviewConflict[];
  pagesWithoutSelectableText: number;
  unmatchedSelectableLineCount: number;
}

export interface ReviewDocumentMetadata {
  mediaType: string;
  fileSizeBytes: number;
  sourceMode: "pdf-selectable-text" | "manual-transcription";
  totalPages: number | null;
  pagesRead: number | null;
  truncated: boolean;
}

export interface ReviewRecord {
  schema: "medlens.review-record";
  schemaVersion: "1.0.0";
  generatedAt: string;
  reviewStatus: "complete" | "incomplete";
  reviewMethod: "in-browser-human-confirmation";
  document: ReviewDocumentMetadata;
  summary: ReviewSummary;
  observations: Array<{
    id: string;
    testKey: string;
    extracted: {
      testName: string;
      valueAsReported: string;
      unitAsReported: string | null;
      referenceIntervalAsReported: string | null;
    };
    reviewed: {
      testName: string;
      valueAsReported: string;
      unitAsReported: string | null;
      referenceIntervalAsReported: string | null;
    };
    source: {
      page: number;
      line: number;
      rawText: string;
      highlightAvailable: boolean;
      highlightBounds: ObservationCandidate["sourceBounds"];
    };
    confirmed: boolean;
  }>;
}

type ExtractionContext = Pick<PdfTextExtraction, "pagesRead" | "lines"> | null;

function rowReference(candidate: ObservationCandidate): ReviewRowReference {
  return {
    id: candidate.id,
    testName: candidate.reviewedTestName,
    page: candidate.page,
    line: candidate.line,
  };
}

function optionalText(value: string): string | null {
  return value.trim() ? value : null;
}

/**
 * Summarize review completeness and extraction limitations without
 * assigning clinical meaning or guessing at missing information.
 */
export function buildReviewSummary(
  candidates: ObservationCandidate[],
  extraction: ExtractionContext,
): ReviewSummary {
  const candidateLineKeys = new Set(candidates.map((candidate) => `${candidate.page}:${candidate.line}`));
  const pagesWithSelectableText = new Set(extraction?.lines.map((line) => line.pageNumber) ?? []);
  const unmatchedSelectableLineCount = extraction
    ? extraction.lines.filter((line) => !candidateLineKeys.has(`${line.pageNumber}:${line.lineNumber}`)).length
    : 0;

  const grouped = new Map<string, ObservationCandidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.page}:${candidate.testKey}`;
    const group = grouped.get(key) ?? [];
    group.push(candidate);
    grouped.set(key, group);
  }

  const potentialConflicts: ReviewConflict[] = [];
  for (const [key, group] of grouped) {
    const values = [...new Set(group.map((candidate) => candidate.reviewedValueAsReported.trim()).filter(Boolean))];
    if (group.length > 1 && values.length > 1) {
      potentialConflicts.push({
        key,
        testKey: group[0].testKey,
        testName: group[0].reviewedTestName,
        page: group[0].page,
        values,
      });
    }
  }

  return {
    candidateCount: candidates.length,
    confirmedCount: candidates.filter((candidate) => candidate.confirmed).length,
    pendingCount: candidates.filter((candidate) => !candidate.confirmed).length,
    missingUnitRows: candidates
      .filter((candidate) => !candidate.reviewedUnitAsReported.trim())
      .map(rowReference),
    missingReferenceIntervalRows: candidates
      .filter((candidate) => !candidate.reviewedReferenceAsReported.trim())
      .map(rowReference),
    missingSourceHighlightRows: candidates
      .filter((candidate) => candidate.sourceBounds.length === 0)
      .map(rowReference),
    potentialConflicts,
    pagesWithoutSelectableText: extraction
      ? Math.max(0, extraction.pagesRead - pagesWithSelectableText.size)
      : 0,
    unmatchedSelectableLineCount,
  };
}

/**
 * Create a portable review record. The caller should only offer export
 * after every detected row has been checked by a person.
 *
 * The source file name is intentionally omitted because it may contain
 * identifying information. The record still contains report-derived text
 * and measurements, so it must be kept private.
 */
export function createReviewRecord(
  candidates: ObservationCandidate[],
  document: ReviewDocumentMetadata,
  extraction: ExtractionContext,
  generatedAt = new Date().toISOString(),
): ReviewRecord {
  const complete = candidates.length > 0 && candidates.every((candidate) => candidate.confirmed);

  return {
    schema: "medlens.review-record",
    schemaVersion: "1.0.0",
    generatedAt,
    reviewStatus: complete ? "complete" : "incomplete",
    reviewMethod: "in-browser-human-confirmation",
    document: { ...document },
    summary: buildReviewSummary(candidates, extraction),
    observations: candidates.map((candidate) => ({
      id: candidate.id,
      testKey: candidate.testKey,
      extracted: {
        testName: candidate.testName,
        valueAsReported: candidate.valueAsReported,
        unitAsReported: candidate.unitAsReported,
        referenceIntervalAsReported: candidate.referenceAsReported,
      },
      reviewed: {
        testName: candidate.reviewedTestName,
        valueAsReported: candidate.reviewedValueAsReported,
        unitAsReported: optionalText(candidate.reviewedUnitAsReported),
        referenceIntervalAsReported: optionalText(candidate.reviewedReferenceAsReported),
      },
      source: {
        page: candidate.page,
        line: candidate.line,
        rawText: candidate.rawLine,
        highlightAvailable: candidate.sourceBounds.length > 0,
        highlightBounds: candidate.sourceBounds.map((bounds) => ({ ...bounds })),
      },
      confirmed: candidate.confirmed,
    })),
  };
}
