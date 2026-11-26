import { describe, expect, it } from "vitest";
import { detectObservationCandidates } from "./candidate-extraction";
import { attachPdfSourceBounds } from "./source-linking";

describe("attachPdfSourceBounds", () => {
  it("links candidates to matching page and line fragments", () => {
    const candidates = detectObservationCandidates("Haemoglobin 13.4 g/dL 12.0-16.0");
    const linked = attachPdfSourceBounds(candidates, [
      {
        pageNumber: 1,
        lineNumber: 1,
        text: "Haemoglobin 13.4 g/dL 12.0-16.0",
        fragments: [
          { text: "Haemoglobin", bounds: { x: 0.1, y: 0.2, width: 0.12, height: 0.02 } },
          { text: "13.4", bounds: { x: 0.4, y: 0.2, width: 0.05, height: 0.02 } },
          { text: "g/dL", bounds: null },
        ],
      },
    ]);

    expect(linked[0].sourceBounds).toEqual([
      { x: 0.1, y: 0.2, width: 0.12, height: 0.02 },
      { x: 0.4, y: 0.2, width: 0.05, height: 0.02 },
    ]);
  });

  it("does not attach geometry from another page with the same line number", () => {
    const candidates = detectObservationCandidates("Haemoglobin 13.4 g/dL 12.0-16.0");
    const linked = attachPdfSourceBounds(candidates, [
      {
        pageNumber: 2,
        lineNumber: 1,
        text: "Haemoglobin 13.4 g/dL 12.0-16.0",
        fragments: [
          { text: "Haemoglobin", bounds: { x: 0.1, y: 0.2, width: 0.12, height: 0.02 } },
        ],
      },
    ]);

    expect(linked[0].sourceBounds).toEqual([]);
  });

  it("keeps the original candidate data and leaves missing source locations explicit", () => {
    const candidates = detectObservationCandidates("WBC 6.1 x10^9/L 4.0-11.0");
    const linked = attachPdfSourceBounds(candidates, []);

    expect(linked[0].rawLine).toBe("WBC 6.1 x10^9/L 4.0-11.0");
    expect(linked[0].sourceBounds).toEqual([]);
    expect(linked[0].confirmed).toBe(false);
  });
});
