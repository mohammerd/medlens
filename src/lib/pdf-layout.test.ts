import { describe, expect, it } from "vitest";
import { groupPositionedText } from "./pdf-layout";

describe("groupPositionedText", () => {
  it("joins fragments on the same visual baseline in left-to-right order", () => {
    const rows = groupPositionedText([
      { text: "12.0-16.0", x: 280, y: 700 },
      { text: "Haemoglobin", x: 40, y: 700 },
      { text: "13.4", x: 190, y: 700 },
      { text: "g/dL", x: 230, y: 700 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Haemoglobin 13.4 g/dL 12.0-16.0");
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
    ], 2);

    expect(rows).toHaveLength(2);
  });
});
