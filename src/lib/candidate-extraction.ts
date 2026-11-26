export interface ObservationCandidate {
  id: string;
  testKey: string;
  testName: string;
  valueAsReported: string;
  unitAsReported: string | null;
  referenceAsReported: string | null;
  rawLine: string;
  page: number;
  line: number;
  confirmed: boolean;
}

const TESTS = [
  { key: "haemoglobin", name: "Haemoglobin", aliases: ["haemoglobin", "hemoglobin", "hgb", "hb"] },
  { key: "white-blood-cell-count", name: "White blood cell count", aliases: ["white blood cell count", "white blood cells", "leukocyte count", "leucocyte count", "wbc"] },
  { key: "red-blood-cell-count", name: "Red blood cell count", aliases: ["red blood cell count", "red blood cells", "erythrocyte count", "rbc"] },
  { key: "platelet-count", name: "Platelet count", aliases: ["platelet count", "platelets", "plt"] },
  { key: "packed-cell-volume", name: "Packed cell volume / haematocrit", aliases: ["packed cell volume", "hematocrit", "haematocrit", "pcv", "hct"] },
  { key: "mean-cell-volume", name: "Mean cell volume", aliases: ["mean corpuscular volume", "mean cell volume", "mcv"] },
  { key: "mean-cell-haemoglobin", name: "Mean cell haemoglobin", aliases: ["mean corpuscular haemoglobin", "mean corpuscular hemoglobin", "mean cell haemoglobin", "mean cell hemoglobin", "mch"] },
  { key: "mean-cell-haemoglobin-concentration", name: "Mean cell haemoglobin concentration", aliases: ["mean corpuscular haemoglobin concentration", "mean corpuscular hemoglobin concentration", "mchc"] },
  { key: "total-cholesterol", name: "Total cholesterol", aliases: ["total cholesterol", "cholesterol"] },
  { key: "hdl-cholesterol", name: "HDL cholesterol", aliases: ["hdl cholesterol", "hdl-c", "hdl"] },
  { key: "ldl-cholesterol", name: "LDL cholesterol", aliases: ["ldl cholesterol", "ldl-c", "ldl"] },
  { key: "triglycerides", name: "Triglycerides", aliases: ["triglycerides", "triglyceride", "tg"] },
  { key: "fasting-glucose", name: "Fasting blood glucose", aliases: ["fasting blood glucose", "fasting blood sugar", "fasting glucose", "fbs"] },
  { key: "random-glucose", name: "Random blood glucose", aliases: ["random blood glucose", "random blood sugar", "rbs"] },
  { key: "glucose", name: "Glucose", aliases: ["blood glucose", "glucose"] },
  { key: "hba1c", name: "HbA1c", aliases: ["glycated haemoglobin", "glycated hemoglobin", "hba1c"] },
] as const;

const ALIASES = TESTS.flatMap((test) =>
  test.aliases.map((alias) => ({ alias, key: test.key, name: test.name })),
).sort((a, b) => b.alias.length - a.alias.length);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function parseMeasurementLine(rawLine: string, page: number, line: number): ObservationCandidate | null {
  const cleanLine = rawLine.trim().replace(/\s+/g, " ");
  if (!cleanLine) return null;

  for (const entry of ALIASES) {
    const labelPattern = new RegExp(
      "^" + escapeRegExp(entry.alias) + "(?=\\s|[:=])\\s*[:=]?\\s*(.+)$",
      "i",
    );
    const labelMatch = labelPattern.exec(cleanLine);
    if (!labelMatch) continue;

    const remainder = labelMatch[1];
    const valueMatch = /[<>≤≥]?\s*\d+(?:[.,]\d+)?/.exec(remainder);
    if (!valueMatch || valueMatch.index === undefined) continue;

    const valueAsReported = valueMatch[0].replace(/\s+/g, "");
    const trailing = remainder.slice(valueMatch.index + valueMatch[0].length);
    const rangePattern = /(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:[.,]\d+)?)/i;
    const rangeMatch = rangePattern.exec(trailing);

    const unitAsReported = (
      rangeMatch ? trailing.slice(0, rangeMatch.index) : trailing
    ).trim().replace(/\s+/g, " ") || null;

    const referenceAsReported = rangeMatch ? rangeMatch[0].trim() : null;

    return {
      id: page + "-" + line + "-" + entry.key,
      testKey: entry.key,
      testName: entry.name,
      valueAsReported,
      unitAsReported,
      referenceAsReported,
      rawLine: cleanLine,
      page,
      line,
      confirmed: false,
    };
  }

  return null;
}

/**
 * Conservative label-at-line-start matching for early report experiments.
 * It deliberately does not infer clinical flags or normalize reported values.
 */
export function detectObservationCandidates(text: string): ObservationCandidate[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const candidates: ObservationCandidate[] = [];
  let page = 1;

  lines.forEach((rawLine, index) => {
    const pageMarker = /^---\s*Page\s+(\d+)\s*---$/i.exec(rawLine.trim());
    if (pageMarker) {
      page = Number(pageMarker[1]);
      return;
    }
    const candidate = parseMeasurementLine(rawLine, page, index + 1);
    if (candidate && !candidates.some((item) => item.id === candidate.id)) {
      candidates.push(candidate);
    }
  });

  return candidates;
}
