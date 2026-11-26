import { describe, expect, it } from "vitest";
import type { ObservationCandidate } from "./candidate-extraction";
import { buildReviewSummary, createReviewRecord } from "./review-record";

const rectangle = { x: 0.1, y: 0.2, width: 0.3, height: 0.04 };

function candidate(overrides: Partial<ObservationCandidate> = {}): ObservationCandidate {
  return {
    id: "1-2-haemoglobin",
    testKey: "haemoglobin",
    testName: "Haemoglobin",
    valueAsReported: "13.4",
    unitAsReported: "g/dL",
    referenceAsReported: "12.0-16.0",
    sourceBounds: [rectangle],
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

const documentMetadata = {
  mediaType: "application/pdf",
  fileSizeBytes: 2048,
  sourceMode: "pdf-selectable-text" as const,
  totalPages: 2,
  pagesRead: 2,
  truncated: false,
};

describe("buildReviewSummary", () => {
  it("surfaces missing fields, unavailable highlights and pages without selectable text", () => {
    const rows = [
      candidate(),
      candidate({
        id: "1-4-white-blood-cell-count",
        testKey: "white-blood-cell-count",
        testName: "White blood cell count",
        reviewedTestName: "White blood cell count",
        valueAsReported: "6.1",
        reviewedValueAsReported: "6.1",
        unitAsReported: null,
        reviewedUnitAsReported: "",
        referenceAsReported: null,
        reviewedReferenceAsReported: "",
        sourceBounds: [],
        rawLine: "WBC 6.1",
        line: 4,
        confirmed: false,
      }),
    ];
    const extraction = {
      pagesRead: 2,
      lines: [
        { pageNumber: 1, lineNumber: 2, text: "Haemoglobin 13.4 g/dL 12.0-16.0", fragments: [] },
        { pageNumber: 1, lineNumber: 4, text: "WBC 6.1", fragments: [] },
        { pageNumber: 1, lineNumber: 5, text: "Other report text", fragments: [] },
      ],
    };

    const summary = buildReviewSummary(rows, extraction);

    expect(summary).toMatchObject({
      candidateCount: 2,
      confirmedCount: 1,
      pendingCount: 1,
      pagesWithoutSelectableText: 1,
      unmatchedSelectableLineCount: 1,
    });
    expect(summary.missingUnitRows).toHaveLength(1);
    expect(summary.missingReferenceIntervalRows).toHaveLength(1);
    expect(summary.missingSourceHighlightRows).toHaveLength(1);
  });

  it("flags different values for a repeated test label on the same page without reconciling them", () => {
    const rows = [
      candidate({ id: "1-2-haemoglobin", valueAsReported: "13.4", reviewedValueAsReported: "13.4", line: 2 }),
      candidate({ id: "1-6-haemoglobin", valueAsReported: "12.8", reviewedValueAsReported: "12.8", line: 6 }),
      candidate({ id: "2-2-haemoglobin", page: 2, valueAsReported: "11.9", reviewedValueAsReported: "11.9", line: 8 }),
    ];

    const summary = buildReviewSummary(rows, null);

    expect(summary.potentialConflicts).toEqual([
      {
        key: "1:haemoglobin",
        testKey: "haemoglobin",
        testName: "Haemoglobin",
        page: 1,
        values: ["13.4", "12.8"],
      },
    ]);
  });
});

describe("createReviewRecord", () => {
  it("preserves extracted and corrected values separately with source provenance", () => {
    const row = candidate({
      reviewedTestName: "Haemoglobin (corrected label)",
      reviewedValueAsReported: "13.6",
      reviewedUnitAsReported: "g/dL",
      reviewedReferenceAsReported: "12-16",
      confirmed: true,
    });
    const record = createReviewRecord([row], documentMetadata, null, "2026-11-26T17:00:00.000Z");

    expect(record).toMatchObject({
      schema: "medlens.review-record",
      schemaVersion: "1.0.0",
      generatedAt: "2026-11-26T17:00:00.000Z",
      reviewStatus: "complete",
      observations: [{
        extracted: {
          testName: "Haemoglobin",
          valueAsReported: "13.4",
          unitAsReported: "g/dL",
          referenceIntervalAsReported: "12.0-16.0",
        },
        reviewed: {
          testName: "Haemoglobin (corrected label)",
          valueAsReported: "13.6",
          unitAsReported: "g/dL",
          referenceIntervalAsReported: "12-16",
        },
        source: {
          page: 1,
          line: 2,
          rawText: "Haemoglobin 13.4 g/dL 12.0-16.0",
          highlightAvailable: true,
          highlightBounds: [rectangle],
        },
        confirmed: true,
      }],
    });
    expect(record.document).toEqual(documentMetadata);
    expect(JSON.stringify(record)).not.toContain("fileName");
  });

  it("does not describe a record with unchecked rows as complete", () => {
    const record = createReviewRecord(
      [candidate({ confirmed: false })],
      documentMetadata,
      null,
      "2026-11-26T17:00:00.000Z",
    );
    expect(record.reviewStatus).toBe("incomplete");
  });
});
