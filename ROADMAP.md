# MEDLENS roadmap

MEDLENS is being developed as an open-source research project. A completed interface is not evidence of medical validity. Each phase must be evaluated before the project moves toward patient-facing use.

## Current milestone — browser-local report review

**Implemented in the frontend repository:**

- Responsive workspace with overview, report list, trends and evidence-library screens.
- Local PDF/image selection and browser preview.
- Selectable-text extraction from PDFs with Mozilla PDF.js.
- Conservative candidate matching for a limited set of CBC, lipid and glucose/HbA1c labels.
- Original raw-line, page/line, reported value, unit text and printed numeric interval shown for manual review.
- Explicit confirmation required for each candidate row.
- Five unit tests for candidate detection, source locations, common labels and abstention on unrecognized or incomplete lines.
- Versioned frontend/backend API contract draft and GitHub Actions validation workflow.

**Not yet verified:** a completed CI run or production build. The development environment could not reach GitHub/npm to install the project's dependencies. Do not mark this milestone build-verified until CI is green.

## Phase 1 — reliable local document review

- Test PDF text extraction against synthetic fixtures from different PDF generators.
- Improve line and table reconstruction while preserving original source text.
- Add scanned-PDF and image OCR as a separately evaluated feature.
- Store extraction candidates in a typed review model, including source coordinates when reliable.
- Add correction UI for test name, value, unit and reference interval.
- Add regression tests for split columns, decimal commas, missing units, comparator values, multiple intervals and confusing labels.
- Keep every candidate unclassified until its source data is confirmed.

Exit criteria: reproducible extraction metrics on a documented synthetic corpus, visible failure states and no silent guesses.

## Phase 2 — independent backend repository

Create `medlens-backend` using Python and FastAPI.

- Implement authenticated report ingestion and private object storage.
- Create database migrations and per-user authorization policies.
- Implement asynchronous document processing with file-size, type and page limits.
- Add OCR/layout extraction and structured observation candidates.
- Preserve original text, unit, reference interval, specimen and source location.
- Expose the agreed versioned API contract.
- Implement deletion, retention, audit and privacy controls before real health data is accepted.

Exit criteria: backend integration tests, authorization tests, file isolation tests, deletion tests and documented threat model.

## Phase 3 — independent benchmark and dataset

- Build a synthetic and appropriately licensed/de-identified laboratory report corpus.
- Establish annotation guidance for test names, values, units, reference ranges and source coordinates.
- Use independent annotators and adjudication for disagreements.
- Publish benchmark schemas, splits, baselines and evaluation scripts.
- Measure field-level precision, recall, exact match, calibration and subgroup/template failure rates.
- Publish failure cases and limitations alongside aggregate results.

Exit criteria: other researchers can reproduce the evaluation without accessing private patient data.

## Phase 4 — evidence-grounded explanations

- Build a reviewed medical terminology and evidence catalogue.
- Separate source facts from explanatory text.
- Link every medical claim to a source and version.
- Implement abstention when evidence, reference range or patient context is insufficient.
- Add clinical review states with named reviewer roles and audit history.
- Compare explanation quality and safety against non-evidence-grounded baselines.

Exit criteria: qualified laboratory and clinical reviewers have evaluated the supported test scope and documented unresolved risk.

## Phase 5 — longitudinal laboratory comparison

- Match compatible tests across reports using terminology, method, specimen and unit context.
- Preserve original values and display any normalized values as additional derived data.
- Detect non-comparable results and refuse unsupported comparisons.
- Evaluate trend calculations on synthetic time-series fixtures.
- Avoid claiming clinical improvement or deterioration from numeric movement alone.

## Phase 6 — controlled institutional pilot

Only after security, privacy, institutional ethics and qualified clinical review:

- Run a limited pilot with informed participants and an approved protocol.
- Keep clinician oversight and a clear escalation path.
- Measure comprehension, extraction errors, usability and safety incidents.
- Do not position MEDLENS as a diagnostic or treatment tool unless the intended-use and regulatory requirements have been separately assessed.

## Non-goals for the early project

- Diagnosis or treatment recommendations.
- Automatic reassurance that a result is safe.
- A general medical chatbot.
- Inference of missing laboratory units or reference ranges.
- Training on identifiable patient records without lawful basis and appropriate approvals.
- Claiming clinical accuracy from a small demo dataset or a successful software build.
