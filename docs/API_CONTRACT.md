# MEDLENS API contract — v1 draft

This document is the coordination point for the separate frontend and backend repositories. It is a proposed contract, **not an implemented or clinically validated API**. Changes should be reviewed in both repositories before release.

## Design rules

- The API is versioned under `/api/v1`.
- Every successful response uses an envelope with `data`, `requestId` and `contractVersion: "v1"`.
- Errors use a stable `code`, safe `message` and `requestId`. Never return stack traces or sensitive document text in error messages.
- All report and observation access must be authorized against the authenticated user and tenant.
- The original reported value, unit and reference interval must be preserved. Normalized values are additional data, never replacements.
- Provenance must identify the source document and page/section, with a bounding box when extraction supports it.
- Extraction confidence and clinical interpretation are separate concepts. High OCR confidence does not mean high clinical certainty.
- The backend controls the safety disposition. The frontend must render it without overriding it.

## Proposed endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/reports` | Submit one supported report using multipart upload |
| GET | `/api/v1/reports` | List reports visible to the authenticated user |
| GET | `/api/v1/reports/{report_id}` | Retrieve report metadata and processing state |
| GET | `/api/v1/reports/{report_id}/observations` | Retrieve structured extracted observations |
| GET | `/api/v1/observations/{observation_id}/explanation` | Retrieve a reviewed, evidence-linked explanation where available |
| DELETE | `/api/v1/reports/{report_id}` | Request deletion of a report and its derived data |

Endpoint methods, payload details, authentication and retention behaviour must be finalized during backend implementation. The frontend prototype does not call these routes yet.

## Observation contract

Each observation should preserve:

- Stable observation ID and optional terminology code.
- Display name, reported value and original unit.
- Specimen and collection time when available.
- Every applicable reference interval and its population/context note.
- A flag of `within_range`, `below_range`, `above_range`, `not_assessed` or `unavailable`.
- Extraction state: `verified`, `needs_verification`, `unreadable` or `conflicting`.
- Extraction confidence as a separate optional numeric measure.
- Source location, original extracted text and validation issues.

## Explanation contract

Explanations must separate plain-language description from interpretation. They should include:

1. What the test measures.
2. What the reported result and source range show.
3. What cannot be concluded from this result alone.
4. Questions the user may discuss with a qualified healthcare professional.
5. Evidence references, versions and the claims they support.
6. A safety disposition: `explain`, `verify`, `abstain` or `escalate`.
7. Whether human review is required and the review status.

The UI must never show an explanation as clinically reviewed unless the backend supplies an explicit reviewed state and provenance.

## Safety behaviour

The frontend must show an explicit verification state for unreadable values, missing units, missing reference intervals, conflicting extraction or unsupported tests. It must not silently infer missing information or perform clinical classification itself.

The backend must not treat LLM confidence, OCR confidence or a generated rationale as proof of medical correctness. Urgent-care routing and any clinical deployment require clinician-authored protocols and formal validation.

## Privacy and operations

- Use private object storage and short-lived signed access where applicable.
- Do not place report contents, names or health measurements in application logs, analytics events, URLs or error telemetry.
- Enforce authorization server-side on every report, observation and deletion operation.
- Define retention, backup expiry, deletion propagation and audit rules before real patient data is accepted.
- The prototype must use synthetic fixtures until institutional, legal and ethics approvals are in place.
