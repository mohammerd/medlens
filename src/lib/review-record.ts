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

export interface ReviewRecordValidation {
  valid: boolean;
  errors: string[];
}

type UnknownObject = Record<string, unknown>;

function isObject(value: unknown): value is UnknownObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isReviewRowReference(value: unknown): boolean {
  return isObject(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.testName)
    && isPositiveInteger(value.page)
    && isPositiveInteger(value.line);
}

function isNormalizedRect(value: unknown): value is ObservationCandidate["sourceBounds"][number] {
  if (!isObject(value)) return false;
  const { x, y, width, height } = value;
  if (
    typeof x !== "number" || !Number.isFinite(x)
    || typeof y !== "number" || !Number.isFinite(y)
    || typeof width !== "number" || !Number.isFinite(width)
    || typeof height !== "number" || !Number.isFinite(height)
  ) return false;
  return x >= 0 && y >= 0 && width > 0 && height > 0
    && x + width <= 1.000001 && y + height <= 1.000001;
}

function validateObservation(value: unknown, index: number, errors: string[]): value is ReviewRecord["observations"][number] {
  const prefix = `observations[${index}]`;
  if (!isObject(value)) {
    errors.push(`${prefix} must be an object`);
    return false;
  }

  let valid = true;
  if (!isNonEmptyString(value.id)) { errors.push(`${prefix}.id must be a non-empty string`); valid = false; }
  if (!isNonEmptyString(value.testKey)) { errors.push(`${prefix}.testKey must be a non-empty string`); valid = false; }

  for (const section of ["extracted", "reviewed"] as const) {
    const fields = value[section];
    if (!isObject(fields)) {
      errors.push(`${prefix}.${section} must be an object`);
      valid = false;
      continue;
    }
    if (!isNonEmptyString(fields.testName)) { errors.push(`${prefix}.${section}.testName is required`); valid = false; }
    if (typeof fields.valueAsReported !== "string") { errors.push(`${prefix}.${section}.valueAsReported must be text`); valid = false; }
    if (!isOptionalString(fields.unitAsReported)) { errors.push(`${prefix}.${section}.unitAsReported must be text or null`); valid = false; }
    if (!isOptionalString(fields.referenceIntervalAsReported)) { errors.push(`${prefix}.${section}.referenceIntervalAsReported must be text or null`); valid = false; }
  }

  const source = value.source;
  if (!isObject(source)) {
    errors.push(`${prefix}.source must be an object`);
    valid = false;
  } else {
    if (!isPositiveInteger(source.page) || !isPositiveInteger(source.line)) {
      errors.push(`${prefix}.source page and line must be positive integers`);
      valid = false;
    }
    if (!isNonEmptyString(source.rawText)) { errors.push(`${prefix}.source.rawText is required`); valid = false; }
    if (!Array.isArray(source.highlightBounds) || !source.highlightBounds.every(isNormalizedRect)) {
      errors.push(`${prefix}.source.highlightBounds contains invalid page geometry`);
      valid = false;
    } else if (source.highlightAvailable !== (source.highlightBounds.length > 0)) {
      errors.push(`${prefix}.source.highlightAvailable does not match its bounds`);
      valid = false;
    }
  }

  if (typeof value.confirmed !== "boolean") { errors.push(`${prefix}.confirmed must be boolean`); valid = false; }
  return valid;
}

/**
 * Validate the portable review-record contract before a JSON file is
 * downloaded or passed to another system. This checks data integrity only;
 * it does not establish extraction correctness or clinical validity.
 */
export function validateReviewRecord(value: unknown): ReviewRecordValidation {
  const errors: string[] = [];
  if (!isObject(value)) return { valid: false, errors: ["Review record must be a JSON object"] };

  if (value.schema !== "medlens.review-record") errors.push("Unsupported review-record schema");
  if (value.schemaVersion !== "1.0.0") errors.push("Unsupported review-record version");
  if (typeof value.generatedAt !== "string" || !Number.isFinite(Date.parse(value.generatedAt))) {
    errors.push("generatedAt must be a valid date-time string");
  }
  if (value.reviewMethod !== "in-browser-human-confirmation") errors.push("Unsupported review method");
  if (value.reviewStatus !== "complete" && value.reviewStatus !== "incomplete") errors.push("Invalid review status");

  const document = value.document;
  if (!isObject(document)) {
    errors.push("document must be an object");
  } else {
    if (!isNonEmptyString(document.mediaType)) errors.push("document.mediaType is required");
    if (!isNonNegativeInteger(document.fileSizeBytes)) errors.push("document.fileSizeBytes must be a non-negative integer");
    if (document.sourceMode !== "pdf-selectable-text" && document.sourceMode !== "manual-transcription") {
      errors.push("Unsupported document source mode");
    }
    for (const key of ["totalPages", "pagesRead"] as const) {
      const pageCount = document[key];
      if (pageCount !== null && !isNonNegativeInteger(pageCount)) errors.push(`document.${key} must be a non-negative integer or null`);
    }
    if (document.totalPages !== null && document.pagesRead !== null
      && isNonNegativeInteger(document.totalPages) && isNonNegativeInteger(document.pagesRead)
      && document.pagesRead > document.totalPages) {
      errors.push("document.pagesRead cannot exceed document.totalPages");
    }
    if (typeof document.truncated !== "boolean") errors.push("document.truncated must be boolean");
  }

  const observations = value.observations;
  if (!Array.isArray(observations) || observations.length === 0) {
    errors.push("observations must contain at least one reviewed candidate");
  } else {
    observations.forEach((observation, index) => validateObservation(observation, index, errors));
    const ids = observations.filter(isObject).map((observation) => observation.id).filter((id): id is string => typeof id === "string");
    if (new Set(ids).size !== ids.length) errors.push("Observation IDs must be unique");
  }

  const summary = value.summary;
  if (!isObject(summary)) {
    errors.push("summary must be an object");
  } else {
    const candidateCount = Array.isArray(observations) ? observations.length : -1;
    const confirmedCount = Array.isArray(observations)
      ? observations.filter((observation) => isObject(observation) && observation.confirmed === true).length
      : -1;
    if (summary.candidateCount !== candidateCount) errors.push("summary.candidateCount does not match observations");
    if (summary.confirmedCount !== confirmedCount) errors.push("summary.confirmedCount does not match observations");
    if (summary.pendingCount !== candidateCount - confirmedCount) errors.push("summary.pendingCount does not match observations");
    for (const key of ["pagesWithoutSelectableText", "unmatchedSelectableLineCount"] as const) {
      if (!isNonNegativeInteger(summary[key])) errors.push(`summary.${key} must be a non-negative integer`);
    }
    for (const key of ["missingUnitRows", "missingReferenceIntervalRows", "missingSourceHighlightRows"] as const) {
      if (!Array.isArray(summary[key]) || !summary[key].every(isReviewRowReference)) {
        errors.push(`summary.${key} contains an invalid row reference`);
      }
    }
    if (!Array.isArray(summary.potentialConflicts) || !summary.potentialConflicts.every((conflict) =>
      isObject(conflict)
      && isNonEmptyString(conflict.key)
      && isNonEmptyString(conflict.testKey)
      && isNonEmptyString(conflict.testName)
      && isPositiveInteger(conflict.page)
      && Array.isArray(conflict.values)
      && conflict.values.length > 1
      && conflict.values.every((entry) => typeof entry === "string" && entry.length > 0)
    )) {
      errors.push("summary.potentialConflicts contains an invalid conflict");
    }
  }

  if (Array.isArray(observations) && observations.length > 0) {
    const complete = observations.every((observation) => isObject(observation) && observation.confirmed === true);
    if (value.reviewStatus !== (complete ? "complete" : "incomplete")) {
      errors.push("reviewStatus does not match the row confirmation states");
    }
  }

  return { valid: errors.length === 0, errors };
}
