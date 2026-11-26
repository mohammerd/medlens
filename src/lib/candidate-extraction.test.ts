import { describe, expect, it } from "vitest";
import { detectObservationCandidates } from "./candidate-extraction";

describe("detectObservationCandidates", () => {
  it("captures CBC values, original units and printed intervals", () => {
    const rows = detectObservationCandidates([
      "--- Page 1 ---",
      "Haemoglobin 13.4 g/dL 12.0-16.0",
      "WBC 6.1 10^9/L 4.0-11.0",
      "Platelets 254 10^9/L 150-400",
    ].join("\n"));

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      testKey: "haemoglobin",
      valueAsReported: "13.4",
      unitAsReported: "g/dL",
      referenceAsReported: "12.0-16.0",
      page: 1,
      confirmed: false,
    });
    expect(rows[1].unitAsReported).toBe("10^9/L");
    expect(rows[2].testName).toBe("Platelet count");
  });

  it("recognizes lipid and HbA1c labels without applying a medical flag", () => {
    const rows = detectObservationCandidates([
      "Total cholesterol 4.8 mmol/L",
      "HDL cholesterol 1.3 mmol/L",
      "LDL-C 2.7 mmol/L",
      "HbA1c 5.6 %",
      "Hemoglobin A1c 5.7 %",
    ].join("\n"));

    expect(rows.map((row) => row.testKey)).toEqual([
      "total-cholesterol",
      "hdl-cholesterol",
      "ldl-cholesterol",
      "hba1c",
      "hba1c",
    ]);
    expect(rows.every((row) => row.confirmed === false)).toBe(true);
    expect(rows[0]).not.toHaveProperty("clinicalStatus");
    expect(rows[0].referenceAsReported).toBeNull();
  });

  it("tracks page markers and source line numbers", () => {
    const rows = detectObservationCandidates([
      "--- Page 1 ---",
      "Haemoglobin 11.8 g/dL 12-16",
      "--- Page 2 ---",
      "Glucose 5.2 mmol/L",
    ].join("\n"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ page: 1, line: 2 });
    expect(rows[1]).toMatchObject({ page: 2, line: 4 });
  });

  it("does not invent rows when a value is missing or a label is unknown", () => {
    const rows = detectObservationCandidates([
      "Haemoglobin",
      "Mystery biomarker 9.8 units 1-10",
      "WBC not readable",
    ].join("\n"));

    expect(rows).toHaveLength(0);
  });

  it("preserves comparator symbols and decimal commas without normalizing them", () => {
    const [row] = detectObservationCandidates("Haemoglobin > 12,5 g/dL");

    expect(row.valueAsReported).toBe(">12,5");
    expect(row.unitAsReported).toBe("g/dL");
    expect(row.referenceAsReported).toBeNull();
  });

  it("preserves the complete matched source line", () => {
    const line = "MCV 88 fL 80-100";
    const [row] = detectObservationCandidates(line);

    expect(row.rawLine).toBe(line);
    expect(row.valueAsReported).toBe("88");
    expect(row.referenceAsReported).toBe("80-100");
  });
});
