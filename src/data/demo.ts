export type LabResult = {
  id: string;
  name: string;
  shortName: string;
  value: string;
  unit: string;
  reference: string;
  status: "within" | "review" | "unavailable";
  explanation: string;
  source: string;
};

export type LabReport = {
  id: string;
  title: string;
  category: string;
  date: string;
  laboratory: string;
  status: "Example" | "Needs verification" | "Not connected";
  results: number;
  resultsNeedingReview: number;
  initials: string;
  color: string;
};

export const demoReports: LabReport[] = [
  {
    id: "report-cbc-01",
    title: "Full Blood Count",
    category: "Haematology",
    date: "12 Nov 2026",
    laboratory: "Example Diagnostics",
    status: "Example",
    results: 18,
    resultsNeedingReview: 0,
    initials: "FB",
    color: "sage",
  },
  {
    id: "report-lipid-01",
    title: "Lipid Profile",
    category: "Clinical chemistry",
    date: "04 Oct 2026",
    laboratory: "Example Diagnostics",
    status: "Needs verification",
    results: 6,
    resultsNeedingReview: 1,
    initials: "LP",
    color: "blue",
  },
  {
    id: "report-glucose-01",
    title: "Glucose & HbA1c",
    category: "Clinical chemistry",
    date: "18 Aug 2026",
    laboratory: "Example Diagnostics",
    status: "Not connected",
    results: 3,
    resultsNeedingReview: 0,
    initials: "GL",
    color: "amber",
  },
];

export const demoResults: LabResult[] = [
  {
    id: "hgb",
    name: "Haemoglobin",
    shortName: "HGB",
    value: "13.4",
    unit: "g/dL",
    reference: "12.0–16.0",
    status: "within",
    explanation:
      "This is a measure of the oxygen-carrying protein in red blood cells. This demonstration value sits inside the example interval displayed here; real interpretation depends on the laboratory, patient context and clinician review.",
    source: "Page 1 · Haematology panel · Row 04",
  },
  {
    id: "wbc",
    name: "White blood cell count",
    shortName: "WBC",
    value: "6.1",
    unit: "10⁹/L",
    reference: "4.0–11.0",
    status: "within",
    explanation:
      "White blood cells are part of the immune system. A count is only one part of a wider clinical picture and should not be used alone to determine whether an infection is present.",
    source: "Page 1 · Haematology panel · Row 07",
  },
  {
    id: "plt",
    name: "Platelet count",
    shortName: "PLT",
    value: "254",
    unit: "10⁹/L",
    reference: "150–400",
    status: "within",
    explanation:
      "Platelets help blood clot. The value and interval shown are synthetic examples for demonstrating the interface, not medical guidance.",
    source: "Page 1 · Haematology panel · Row 10",
  },
  {
    id: "mcv",
    name: "Mean cell volume",
    shortName: "MCV",
    value: "88",
    unit: "fL",
    reference: "80–100",
    status: "within",
    explanation:
      "Mean cell volume describes the average size of red blood cells. It is usually interpreted alongside other blood count measurements.",
    source: "Page 1 · Red cell indices · Row 13",
  },
];


export const demoLipidResults: LabResult[] = [
  {
    id: "total-cholesterol",
    name: "Total cholesterol",
    shortName: "TC",
    value: "4.8",
    unit: "mmol/L",
    reference: "Not supplied",
    status: "review",
    explanation: "This measurement is part of a lipid profile. Its meaning depends on the laboratory method and the person's overall cardiovascular risk. The source interval is deliberately absent from this sample, so MEDLENS should not classify the value.",
    source: "Page 1 · Lipid panel · Row 02",
  },
  {
    id: "hdl",
    name: "HDL cholesterol",
    shortName: "HDL",
    value: "1.3",
    unit: "mmol/L",
    reference: "Not supplied",
    status: "unavailable",
    explanation: "HDL is one of the cholesterol measurements in a lipid profile. Targets and interpretation depend on clinical context; this prototype does not provide a medical assessment.",
    source: "Page 1 · Lipid panel · Row 03",
  },
  {
    id: "ldl",
    name: "LDL cholesterol",
    shortName: "LDL",
    value: "2.7",
    unit: "mmol/L",
    reference: "Not supplied",
    status: "unavailable",
    explanation: "LDL is another measurement in a lipid profile. A value should be considered with the full report and individual risk factors by a qualified professional.",
    source: "Page 1 · Lipid panel · Row 04",
  },
];

export const demoGlucoseResults: LabResult[] = [
  {
    id: "hba1c",
    name: "HbA1c",
    shortName: "HbA1c",
    value: "5.6",
    unit: "%",
    reference: "Not supplied",
    status: "unavailable",
    explanation: "HbA1c reflects average blood glucose exposure over a period of time. The laboratory method, reporting standard and clinical context matter. No interpretation is provided in this demonstration.",
    source: "Page 1 · Glycaemic panel · Row 01",
  },
  {
    id: "glucose",
    name: "Glucose",
    shortName: "GLU",
    value: "5.1",
    unit: "mmol/L",
    reference: "Not supplied",
    status: "unavailable",
    explanation: "Blood glucose is interpreted differently depending on whether the sample was fasting, random or collected after a glucose challenge. That context is not supplied in this sample record.",
    source: "Page 1 · Glycaemic panel · Row 02",
  },
];

export const demoResultsByReport: Record<string, LabResult[]> = {
  "report-cbc-01": demoResults,
  "report-lipid-01": demoLipidResults,
  "report-glucose-01": demoGlucoseResults,
};

export const trendPoints = [
  { label: "Jun", value: 12.6 },
  { label: "Jul", value: 12.4 },
  { label: "Aug", value: 12.8 },
  { label: "Sep", value: 13.0 },
  { label: "Oct", value: 13.1 },
  { label: "Nov", value: 13.4 },
];