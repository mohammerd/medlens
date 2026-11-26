import { describe, expect, it } from "vitest";
import type { ObservationCandidate } from "./candidate-extraction";
import { createFhirR4ObservationBundle } from "./fhir-export";
import { createReviewRecord, type ReviewDocumentMetadata, type ReviewRecord } from "./review-record";

function candidate(overrides: Partial<ObservationCandidate> = {}): ObservationCandidate {
  return {
    id: "1-2-haemoglobin",
    testKey: "haemoglobin",
    testName: "Haemoglobin",
    valueAsReported: "13.4",
    unitAsReported: "g/dL",
    referenceAsReported: "12.0-16.0",
    sourceBounds: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.04 }],
    reviewedTestName: "Haemoglobin",
    reviewedValueAsReported: "13.4",
    reviewedUnitAsReported: "g/dL",
    reviewedReferenceAsReported: "12.0-16.0",
    rawLine: "Haemoglobin 13.4 g/dL 12.0-16.0",
    page: 1,
    line: 2,
    confirmed: true,
    ...overrides,
  };
}

const documentMetadata: ReviewDocumentMetadata = {
  mediaType: "application/pdf",
  fileSizeBytes: 2048,
  sourceMode: "pdf-selectable-text",
  totalPages: 2,
  pagesRead: 2,
  truncated: false,
};

function reviewedRecord(rows: ObservationCandidate[] = [candidate()]): ReviewRecord {
  return createReviewRecord(rows, documentMetadata, null, "2026-11-27T10:00:00.000Z");
}

describe("createFhirR4ObservationBundle", () => {
  it("creates a FHIR R4 collection with a minimally coded, source-traceable observation", () => {
    const bundle = createFhirR4ObservationBundle(reviewedRecord());
    const observation = bundle.entry[0].resource;

    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("collection");
    expect(bundle.timestamp).toBe("2026-11-27T10:00:00.000Z");
    expect(bundle.entry).toHaveLength(1);
    expect(observation).toMatchObject({
      resourceType: "Observation",
      status: "unknown",
      category: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/observation-category",
          code: "laboratory",
          display: "Laboratory",
        }],
      }],
      code: { text: "Haemoglobin" },
      valueQuantity: { value: 13.4, unit: "g/dL" },
      referenceRange: [{ text: "12.0-16.0" }],
    });
    expect(observation.note.map((entry) => entry.text)).toEqual(expect.arrayContaining([
      expect.stringContaining("page 1, line 2"),
      expect.stringContaining("Haemoglobin 13.4 g/dL 12.0-16.0"),
      expect.stringContaining("Original extracted fields"),
      expect.stringContaining("not clinical verification"),
    ]));
    expect(observation).not.toHaveProperty("subject");
    expect(observation).not.toHaveProperty("effectiveDateTime");
    expect(observation).not.toHaveProperty("performer");
    expect(observation).not.toHaveProperty("interpretation");
    expect(observation.code).not.toHaveProperty("coding");
  });

  it("preserves comparator semantics in FHIR Quantity without assigning a clinical flag", () => {
    const rows = [
      candidate({ id: "1-2-haemoglobin", reviewedValueAsReported: ">12.5" }),
      candidate({ id: "1-3-wbc", testKey: "wbc", reviewedTestName: "White blood cell count", reviewedValueAsReported: "≤ 4.0" }),
    ];
    const bundle = createFhirR4ObservationBundle(reviewedRecord(rows));

    expect(bundle.entry[0].resource.valueQuantity).toMatchObject({ value: 12.5, comparator: ">" });
    expect(bundle.entry[1].resource.valueQuantity).toMatchObject({ value: 4, comparator: "<=" });
    expect(bundle.entry.every(({ resource }) => !("interpretation" in resource))).toBe(true);
  });

  it("keeps decimal-comma values as text instead of normalizing them", () => {
    const record = reviewedRecord([candidate({ reviewedValueAsReported: "13,4" })]);
    const observation = createFhirR4ObservationBundle(record).entry[0].resource;

    expect(observation.valueString).toBe("13,4");
    expect(observation).not.toHaveProperty("valueQuantity");
    expect(observation.note.map((entry) => entry.text)).toContain("Reported unit: g/dL");
  });

  it("preserves non-numeric result text and units without guessing", () => {
    const record = reviewedRecord([candidate({
      reviewedValueAsReported: "Not detected",
      reviewedUnitAsReported: "qualitative",
      reviewedReferenceAsReported: "",
    })]);
    const observation = createFhirR4ObservationBundle(record).entry[0].resource;

    expect(observation.valueString).toBe("Not detected");
    expect(observation.referenceRange).toBeUndefined();
    expect(observation.note.map((entry) => entry.text)).toContain("Reported unit: qualitative");
  });

  it("refuses unconfirmed records and records that fail integrity validation", () => {
    const incomplete = reviewedRecord([candidate({ confirmed: false })]);
    const invalid = {
      ...reviewedRecord(),
      summary: { ...reviewedRecord().summary, candidateCount: 9 },
    } as ReviewRecord;

    expect(() => createFhirR4ObservationBundle(incomplete)).toThrow("every candidate row to be human-confirmed");
    expect(() => createFhirR4ObservationBundle(invalid)).toThrow("invalid MEDLENS review record");
  });
});
