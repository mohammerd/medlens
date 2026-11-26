import type { ReviewRecord } from "./review-record";
import { validateReviewRecord } from "./review-record";

export interface FhirR4Quantity {
  value: number;
  comparator?: "<" | "<=" | ">=" | ">";
  unit?: string;
}

export interface FhirR4CodeableConcept {
  text?: string;
  coding?: Array<{
    system: string;
    code: string;
    display?: string;
  }>;
}

export interface FhirR4Observation {
  resourceType: "Observation";
  status: "unknown";
  category: FhirR4CodeableConcept[];
  code: FhirR4CodeableConcept;
  valueQuantity?: FhirR4Quantity;
  valueString?: string;
  referenceRange?: Array<{ text: string }>;
  note: Array<{ text: string }>;
}

export interface FhirR4ObservationBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  entry: Array<{ resource: FhirR4Observation }>;
}

const LABORATORY_CATEGORY = {
  system: "http://terminology.hl7.org/CodeSystem/observation-category",
  code: "laboratory",
  display: "Laboratory",
} as const;

const NUMERIC_VALUE = /^\s*(<=|>=|<|>|≤|≥)?\s*(\d+(?:\.\d+)?)\s*$/;

/**
 * Convert a narrow, unambiguous numeric representation to FHIR Quantity.
 * Decimal commas, units embedded in the value and other ambiguous text stay
 * as valueString so the export never guesses how to normalize the source.
 */
function toQuantity(value: string, unit: string | null): FhirR4Quantity | null {
  const match = NUMERIC_VALUE.exec(value);
  if (!match) return null;

  const numericValue = Number(match[2]);
  if (!Number.isFinite(numericValue)) return null;

  const rawComparator = match[1];
  const comparator = rawComparator === "≤"
    ? "<="
    : rawComparator === "≥"
      ? ">="
      : rawComparator;

  return {
    value: numericValue,
    ...(comparator ? { comparator: comparator as FhirR4Quantity["comparator"] } : {}),
    ...(unit?.trim() ? { unit: unit.trim() } : {}),
  };
}

function formatOriginalFields(record: ReviewRecord["observations"][number]): string {
  const originalUnit = record.extracted.unitAsReported ? ` ${record.extracted.unitAsReported}` : "";
  const originalRange = record.extracted.referenceIntervalAsReported
    ? `; reference interval: ${record.extracted.referenceIntervalAsReported}`
    : "; reference interval: not present in extracted text";
  return `${record.extracted.testName}: ${record.extracted.valueAsReported}${originalUnit}${originalRange}`;
}

function toObservation(record: ReviewRecord["observations"][number]): FhirR4Observation {
  const quantity = toQuantity(record.reviewed.valueAsReported, record.reviewed.unitAsReported);
  const sourceUnit = record.reviewed.unitAsReported?.trim();

  const notes = [
    "MEDLENS local transcription review: a person confirmed the extracted fields against the source document. This is not clinical verification or interpretation.",
    `Source location: page ${record.source.page}, line ${record.source.line}.`,
    `Source text: ${record.source.rawText}`,
    `Original extracted fields: ${formatOriginalFields(record)}`,
  ];

  if (!quantity && sourceUnit) {
    notes.push(`Reported unit: ${sourceUnit}`);
  }

  return {
    resourceType: "Observation",
    // The user's confirmation concerns transcription only. It does not prove
    // the originating laboratory's workflow status, so do not mark it final.
    status: "unknown",
    category: [{ coding: [LABORATORY_CATEGORY] }],
    // No LOINC code is assigned: a display label is safer than a guessed code.
    code: { text: record.reviewed.testName },
    ...(quantity
      ? { valueQuantity: quantity }
      : { valueString: record.reviewed.valueAsReported }),
    ...(record.reviewed.referenceIntervalAsReported
      ? { referenceRange: [{ text: record.reviewed.referenceIntervalAsReported }] }
      : {}),
    note: notes.map((text) => ({ text })),
  };
}

/**
 * Build a FHIR R4 collection containing only human-confirmed observation rows.
 *
 * This is an interoperability export of the reviewed transcription, not a
 * complete DiagnosticReport. No patient identity, collection time, laboratory
 * identity, clinical status or terminology code is fabricated.
 */
export function createFhirR4ObservationBundle(record: ReviewRecord): FhirR4ObservationBundle {
  const validation = validateReviewRecord(record);
  if (!validation.valid) {
    throw new Error(`Cannot export an invalid MEDLENS review record: ${validation.errors.join("; ")}`);
  }
  if (record.reviewStatus !== "complete") {
    throw new Error("FHIR export requires every candidate row to be human-confirmed");
  }

  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date(record.generatedAt).toISOString(),
    entry: record.observations.map((observation) => ({
      resource: toObservation(observation),
    })),
  };
}
