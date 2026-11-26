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
  status: "Reviewed" | "Needs review" | "Demo";
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
    status: "Reviewed",
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
    status: "Needs review",
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
    status: "Demo",
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

export const trendPoints = [
  { label: "Jun", value: 12.6 },
  { label: "Jul", value: 12.4 },
  { label: "Aug", value: 12.8 },
  { label: "Sep", value: 13.0 },
  { label: "Oct", value: 13.1 },
  { label: "Nov", value: 13.4 },
];