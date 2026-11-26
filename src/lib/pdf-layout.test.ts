import { describe, expect, it } from "vitest";
import { groupPositionedText, normalizePdfTextItemBounds, normalizeViewportRect } from "./pdf-layout";
import { detectObservationCandidates } from "./candidate-extraction";

describe("groupPositionedText", () => {
  it("normalizes PDF viewport coordinates for responsive highlighting", () => {
    expect(normalizeViewportRect([100, 200, 300, 240], 1000, 800)).toEqual({
      x: 0.1,
      y: 0.25,
      width: 0.2,
      height: 0.05,
    });
  });

  it("clips highlight rectangles to the page bounds", () => {
    expect(normalizeViewportRect([-20, 50, 120, 150], 100, 100)).toEqual({
      x: 0,
      y: 0.5,
      width: 1,
      height: 0.5,
    });
  });

  it("rejects invalid or zero-area highlight rectangles", () => {
    expect(normalizeViewportRect([10, 10, 10, 20], 100, 100)).toBeNull();
    expect(normalizeViewportRect([0, 0, 10, 10], 0, 100)).toBeNull();
    expect(normalizeViewportRect([0, 0, Number.NaN, 10], 100, 100)).toBeNull();
  });

  it("joins fragments on the same visual baseline in left-to-right order", () => {
    const rows = groupPositionedText([
      { text: "12.0-16.0", x: 280, y: 700 },
      { text: "Haemoglobin", x: 40, y: 700 },
      { text: "13.4", x: 190, y: 700 },
      { text: "g/dL", x: 230, y: 700 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Haemoglobin 13.4 g/dL 12.0-16.0");
    expect(rows[0].fragments.map((fragment) => fragment.text)).toEqual(["Haemoglobin", "13.4", "g/dL", "12.0-16.0"]);
  });

  it("separates nearby visual rows and sorts them top to bottom", () => {
    const rows = groupPositionedText([
      { text: "WBC", x: 40, y: 680 },
      { text: "6.1", x: 180, y: 680 },
      { text: "Haemoglobin", x: 40, y: 700 },
      { text: "13.4", x: 180, y: 700 },
    ]);

    expect(rows.map((row) => row.text)).toEqual([
      "Haemoglobin 13.4",
      "WBC 6.1",
    ]);
  });

  it("passes reconstructed laboratory rows into the candidate detector", () => {
    const rows = groupPositionedText([
      { text: "12.0-16.0", x: 320, y: 710 },
      { text: "g/dL", x: 250, y: 710 },
      { text: "13.4", x: 190, y: 710 },
      { text: "Haemoglobin", x: 40, y: 710 },
      { text: "WBC", x: 40, y: 690 },
      { text: "6.1", x: 190, y: 690 },
    ]);

    const candidates = detectObservationCandidates(
      "--- Page 1 ---\n" + rows.map((row) => row.text).join("\n"),
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      testKey: "haemoglobin",
      valueAsReported: "13.4",
      unitAsReported: "g/dL",
      referenceAsReported: "12.0-16.0",
    });
    expect(candidates[1].valueAsReported).toBe("6.1");
  });

  it("ignores empty text and non-finite coordinates", () => {
    const rows = groupPositionedText([
      { text: "   ", x: 20, y: 20 },
      { text: "bad", x: Number.NaN, y: 20 },
      { text: "Platelets", x: 20, y: 20 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Platelets");
  });

  it("keeps rows separate outside the configured tolerance", () => {
    const rows = groupPositionedText([
      { text: "A", x: 0, y: 100 },
      { text: "B", x: 20, y: 96 },
    ], 2.5);

    expect(rows).toHaveLength(2);
  });
  it("transforms text bounds through a rotated PDF viewport", () => {
    expect(normalizePdfTextItemBounds(10, 30, 20, 10, [0, 1, -1, 0, 100, 0], 100, 100)).toEqual({ x: 0.7, y: 0.1, width: 0.1, height: 0.2 });
  });

  it("returns null for invalid text-item geometry", () => {
    expect(normalizePdfTextItemBounds(10, 30, 0, 10, [1, 0, 0, -1, 0, 100], 100, 100)).toBeNull();
    expect(normalizePdfTextItemBounds(10, 30, 20, 10, [1, 0, 0, -1, 0, 100], 0, 100)).toBeNull();
  });

  it("groups fragments deterministically by nearest baseline", () => {
    const items = [{ text: "interval", x: 250, y: 700, height: 10 }, { text: "Haemoglobin", x: 20, y: 700, height: 10 }, { text: "13.4", x: 150, y: 698.5, height: 8 }, { text: "WBC", x: 20, y: 684, height: 10 }, { text: "6.1", x: 150, y: 684, height: 10 }];
    const expected = ["Haemoglobin 13.4 interval", "WBC 6.1"];
    expect(groupPositionedText(items).map((row) => row.text)).toEqual(expected);
    expect(groupPositionedText([...items].reverse()).map((row) => row.text)).toEqual(expected);
  });

  it("does not chain adjacent baselines into one oversized row", () => {
    const rows = groupPositionedText([{ text: "first", x: 10, y: 100, height: 8 }, { text: "middle", x: 10, y: 97.5, height: 8 }, { text: "last", x: 10, y: 95, height: 8 }], 2);
    expect(rows.map((row) => row.text)).toEqual(["first middle", "last"]);
  });

  it("normalizes whitespace in reconstructed rows", () => {
    const rows = groupPositionedText([{ text: "Haemoglobin   ", x: 10, y: 100 }, { text: "  13.4  ", x: 120, y: 100 }]);
    expect(rows[0].text).toBe("Haemoglobin 13.4");
  });
});
