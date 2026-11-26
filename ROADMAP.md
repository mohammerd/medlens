# MEDLENS roadmap

MEDLENS is an open-source final-year research project exploring traceable, uncertainty-aware explanations of medical laboratory reports. The goal is a rigorously evaluated prototype, not an all-purpose clinical product.

## Current milestone — source-linked local report review

**Implemented in the frontend repository:**

- Responsive research workspace with overview, report library, trends and evidence-library screens.
- Local PDF/image selection, preview and file-size/type checks.
- Selectable-text extraction from PDFs with Mozilla PDF.js; scanned PDFs and image OCR are not implemented.
- Approximate visual-row grouping before candidate detection.
- Conservative candidate matching for a limited set of CBC, lipid and glucose/HbA1c labels.
- Preservation of original text, page/line, reported value, unit and printed numeric interval.
- Editable candidate fields; every edit clears the row's confirmation state.
- Explicit per-row human confirmation.
- Review-quality summary for missing units and printed intervals, unavailable source highlights, repeated labels with differing values, pages without selectable text and unmatched lines.
- Versioned JSON review export preserving extracted and corrected fields separately, source text, page/line provenance and normalized highlight bounds; export is a user-managed local download, not app persistence.
- Runtime validation before export checks schema/version, confirmation counts and status, unique observation IDs, page counts, source references and normalized highlight bounds. This checks record integrity, not clinical correctness.
- Approximate text-fragment rectangles retained in normalized page coordinates.
- A local PDF page viewer with source navigation and highlight overlays for selected candidates.
- Synthetic FBC fixture and automated regression tests across candidate extraction, PDF row grouping, highlight geometry and exact page/line source linking.
- Versioned frontend/backend API contract draft, extraction limitations and security/contribution documentation.
- GitHub Actions validation: TypeScript, tests and production build passed on PR #2.

**Not implemented:** OCR for scanned documents, backend integration, authentication, database persistence, evidence retrieval, or AI-generated explanations. Do not use real patient reports in this prototype.

## Phase 1 — finish the frontend verification experience

**Status:** the core local review workflow, source navigation, review summaries, typed JSON export and export-integrity checks are implemented. The remaining manual verification task is to test the PDF viewer against synthetic documents produced by more than one PDF generator and record any geometry differences as regression fixtures. The automated layout suite already covers mixed font sizes, shuffled fragments, close rows, rotated geometry and whitespace.

The exit criteria remain: a user can select a PDF, preview it, extract supported FBC rows, jump from each candidate to its approximate source text, correct fields, and complete a review with a reproducible local record. All failure states must remain visible.

**Exit criteria:** a user can select a PDF, preview it, extract supported FBC rows, jump from each candidate to its approximate source text, correct fields, and complete a review with a reproducible local record. All failure states are visible.

## Phase 2 — independent backend repository

Create medlens-backend using Python and FastAPI.

- Implement authenticated report ingestion and private object storage.
- Add database migrations and per-user authorization policies.
- Process documents asynchronously with file type, size and page limits.
- Add OCR/layout extraction for scanned PDFs and images as a separately evaluated pipeline.
- Preserve the original text, original value, unit, laboratory interval and source location.
- Expose the agreed versioned API contract.
- Implement report deletion, retention, audit logging and privacy controls before accepting identifiable health information.

**Exit criteria:** frontend/backend integration tests pass; authorization, file isolation and deletion tests pass; a threat model and data-retention policy are documented.

## Phase 3 — constrained FBC explanation engine

Start with Full Blood Count only. Do not expand to every laboratory panel yet.

- Create a reviewed catalogue of supported FBC tests, units and plain-language definitions.
- Separate extracted facts from generated explanatory text.
- Explain what each supported measurement represents, what the report itself says, and what cannot be concluded from that measurement alone.
- Attach a versioned evidence reference to every factual medical claim.
- Generate questions users can discuss with qualified healthcare professionals.
- Abstain when the test is unsupported, the source is ambiguous, the unit or interval is missing, or required context is unavailable.
- Do not diagnose, recommend medication, or advise treatment changes.

**Exit criteria:** qualified laboratory and clinical reviewers assess the supported explanations, evidence links and abstention behaviour. Every limitation is documented.

## Phase 4 — evaluation and final-year demonstration

- Build a versioned test set using synthetic and appropriately licensed/de-identified FBC reports.
- Annotate test name, value, unit, interval and source location; adjudicate disagreements.
- Measure field-level precision, recall and exact match separately. Report failures by document template and scan quality.
- Test the explanation layer for evidence coverage, unsupported claims and appropriate abstention.
- Conduct a small, approved usability study focused on whether people understand the report wording and know what to ask a healthcare professional.
- Publish test fixtures, annotation guidance, evaluation scripts and a limitations report.
- Demonstrate the complete flow: report input → extraction → source verification → plain-language explanation → questions for a healthcare professional.

**Exit criteria:** the evaluation is reproducible, the demonstration works end to end, and known failure cases are visible. Results must be reported honestly; do not claim clinical validation from a software test or small dataset.

## Final-year project stop line

For the school submission, stop after the Phase 4 demonstration and evaluation.

The finished project should be a strong, complete vertical slice:

1. **Frontend:** polished local report workflow, editable FBC candidates and PDF source highlights.
2. **Backend:** secure API, storage, OCR and structured observations with provenance.
3. **Intelligence:** evidence-grounded FBC explanations, questions for a healthcare professional and clear abstention.
4. **Research:** documented dataset, field-level extraction evaluation, explanation review and usability findings.
5. **Demonstration:** reproducible end-to-end flow with a clear installation guide and architecture documentation.

Do not add voice assistants, multilingual support, wearables, hospital integrations, treatment recommendations, autonomous agents, broad multi-panel coverage or longitudinal prediction before this stop line is met. Those are future research directions, not requirements for the final-year deliverable.

## Future research beyond the project

After the final-year evaluation, possible extensions include additional report panels, carefully validated longitudinal comparisons, multilingual explanations and clinical/institutional pilots. Each requires its own evidence, safety, privacy and regulatory review.

## Non-goals

- Diagnosis or treatment recommendations.
- Automatic reassurance that a result is safe.
- A general medical chatbot.
- Inference of missing laboratory units or reference intervals.
- Training on identifiable patient records without a lawful basis and appropriate approvals.
- Claims of clinical accuracy from a small demonstration or a successful CI run.
