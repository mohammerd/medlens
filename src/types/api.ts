/**
 * Frontend-facing MEDLENS API contract draft.
 *
 * These types describe the boundary between the frontend and the planned
 * backend. They are not evidence that any API endpoint is implemented.
 */

export type SafetyDisposition = "explain" | "verify" | "abstain" | "escalate";

export type ExtractionState =
  | "verified"
  | "needs_verification"
  | "unreadable"
  | "conflicting";

export type ObservationFlag =
  | "within_range"
  | "below_range"
  | "above_range"
  | "not_assessed"
  | "unavailable";

export interface ReferenceInterval {
  low?: number;
  high?: number;
  text?: string;
  unit?: string;
  populationNote?: string;
  sourceLaboratory?: string;
}

export interface SourceLocation {
  documentId: string;
  page?: number;
  section?: string;
  rowLabel?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    coordinateSpace: "page_normalized";
  };
}

export interface LabObservation {
  id: string;
  displayName: string;
  code?: {
    system: string;
    value: string;
    display?: string;
  };
  value?: number | string;
  unit?: string;
  specimen?: string;
  collectedAt?: string;
  referenceIntervals: ReferenceInterval[];
  flag: ObservationFlag;
  extraction: {
    state: ExtractionState;
    confidence?: number;
    source: SourceLocation;
    originalText?: string;
  };
  validationIssues: string[];
}

export interface EvidenceReference {
  id: string;
  title: string;
  publisher: string;
  version?: string;
  url?: string;
  publishedAt?: string;
  reviewedAt?: string;
  supportsClaimIds: string[];
}

export interface Explanation {
  observationId: string;
  plainLanguageSummary: string;
  whatTheResultCanShow: string[];
  whatCannotBeConcluded: string[];
  questionsForProfessional: string[];
  evidence: EvidenceReference[];
  safety: {
    disposition: SafetyDisposition;
    reasonCodes: string[];
    humanReviewRequired: boolean;
  };
  review: {
    status: "not_reviewed" | "reviewed" | "rejected";
    reviewerRole?: string;
    reviewedAt?: string;
  };
}

export interface LabReportSummary {
  id: string;
  originalFileName: string;
  reportType?: string;
  laboratoryName?: string;
  reportDate?: string;
  status: "uploaded" | "processing" | "ready" | "needs_review" | "failed";
  createdAt: string;
  observationCount: number;
}

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
}

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
  contractVersion: "v1";
}
