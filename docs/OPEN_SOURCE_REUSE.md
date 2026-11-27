# Open-source reuse assessment

**Reviewed:** 27 November 2026  
**Purpose:** identify mature, relevant projects that can shorten MEDLENS development without weakening provenance, privacy or clinical-safety boundaries.

MEDLENS is a local-first laboratory-report review prototype. It is not a laboratory information system (LIS), an electronic health record (EHR), a radiology/DICOM viewer or a diagnostic product. Reuse should therefore be selective: take proven document-review, interoperability and testing patterns rather than importing an entire hospital platform.

## Findings

| Project | What it provides | License | MEDLENS decision |
|---|---|---|---|
| [ParseLabs](https://github.com/tsilva/parselabs) | Medical laboratory PDF/image extraction, a page-linked review queue, accept/reject decisions, result history and a private regression-corpus workflow | MIT (declared in its README) | Best domain-level reference. Reuse the testing and review-workflow ideas; do not inherit its model/API extraction path. |
| [Medplum](https://github.com/medplum/medplum) | TypeScript healthcare platform, React components, FHIR server/SDK and the `@medplum/fhirtypes` package for FHIR R4 resources | Apache-2.0 | Strongest candidate for typed interoperability. Evaluate the small FHIR types package when the backend contract is implemented; do not adopt the full platform for this frontend prototype. |
| [OpenELIS Global](https://openelis-global.org/) | Full laboratory information system, including laboratory workflow, React-based user interface and FHIR interoperability | MPL-2.0 | Reference its laboratory workflow and information architecture. Avoid copying large application modules or adding its backend stack to MEDLENS. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Browser/Node OCR for images, backed by WebAssembly; worker API supports repeated recognition jobs | Apache-2.0 | Candidate for a future, opt-in OCR experiment. It does not read PDF files directly; PDF pages must first be rendered to images. OCR output must remain unverified until a person checks it. |
| [Scribe.js](https://github.com/scribeocr/scribe.js) | JavaScript text extraction and OCR for both text-native and image-native PDFs | AGPL-3.0 | Technically relevant, but do not bundle it into the MIT-licensed MEDLENS app without a deliberate licence review or separate commercial permission. It may be evaluated separately as a benchmark tool. |

## What we should take from each project

### 1. ParseLabs — strongest workflow and evaluation reference

ParseLabs is the closest match to MEDLENS because it extracts laboratory observations from reports and keeps extraction separate from reviewer decisions.

Useful patterns to adapt:

- Keep each extracted observation linked to its original page and source text.
- Give reviewers a focused queue with the source page visible beside the observation.
- Keep the extracted value separate from the reviewer-corrected value.
- Build a versioned regression corpus and compare new extraction results against reviewed expected results.
- Keep real or sensitive documents outside Git, cloud-synced output folders and CI. Commit only synthetic fixtures and generic test code.

MEDLENS already implements much of the source-linked review and correction flow. The largest gap is broader document-template evaluation. We should adopt the *golden-corpus method*, not copy ParseLabs' LLM-dependent extraction path: MEDLENS should be able to test deterministic extraction without requiring a paid model API.

### 2. Medplum — avoid inventing a healthcare data standard

The current MEDLENS API contract has a custom `LabObservation` type. It captures useful MEDLENS-specific provenance and review state, but it is not itself a FHIR resource.

When the backend contract is ready, evaluate `@medplum/fhirtypes` rather than hand-writing FHIR interfaces. The likely mapping is:

- A laboratory measurement maps to a FHIR R4 `Observation`.
- A laboratory report that groups measurements maps to `DiagnosticReport`.
- The sample context maps to `Specimen`.
- The original report/document reference and extraction provenance need their own explicit representation.

Relevant FHIR R4 references: [Observation](https://hl7.org/fhir/R4/observation.html), [DiagnosticReport](https://hl7.org/fhir/R4/diagnosticreport.html), [Specimen](https://hl7.org/fhir/R4/specimen.html) and [DocumentReference](https://hl7.org/fhir/R4/documentreference.html).

Do not throw away MEDLENS review details to fit a standard resource. Preserve the reported text, reviewed text, source page/line, extraction state and human-review audit trail, then map the structured clinical data to FHIR at the API boundary. Do not assign a terminology code unless the match is verified.

### 3. OpenELIS Global — borrow laboratory workflow concepts

OpenELIS is a full LIS: it manages laboratory operations rather than only interpreting a patient-uploaded report. Its workflow concepts can inform future designs for report status, specimen context, result verification and auditability.

Its React/Carbon frontend is worth studying for information hierarchy and dense laboratory workflows. MEDLENS already has a custom React/TypeScript interface, so adding the entire Carbon stack or copying OpenELIS screens is not justified yet.

### 4. Tesseract.js and Scribe.js — OCR is a separate experiment

The current MEDLENS PDF.js flow extracts selectable text. It cannot recover text from image-only scans, and the image path currently relies on manual transcription.

Tesseract.js can recognize images in the browser, but its own documentation says it does not accept PDF files directly. A PDF OCR experiment would first render a page with PDF.js, then pass the rendered image to an OCR worker. Reuse workers across pages and terminate them after the job to control memory use.

Scribe.js supports PDF input directly, including OCR for image-native PDFs, but it is AGPL-3.0. Because MEDLENS is MIT-licensed, it is not the default dependency choice. Do not add either OCR library until we have synthetic scan fixtures, field-level accuracy measurements and a UI that makes every OCR result visibly unverified.

OCR confidence is not clinical certainty. A single digit or decimal-point error can change a laboratory measurement; the original page must remain available for human comparison.

## Recommended implementation order

1. **Finish the current frontend milestone:** test PDF extraction and highlight geometry against synthetic reports produced by at least two PDF generators. Record failures as regression fixtures. Keep all fixtures synthetic.
2. **Adopt ParseLabs' evaluation discipline:** add a documented, versioned expected-output format for synthetic reports. Test field extraction, source location, missing fields and conflicting rows separately. Keep private real-world reports out of Git and CI.
3. **Prepare standards-based interoperability:** map the MEDLENS observation model to FHIR R4 using Medplum's type definitions when the backend API is implemented. Keep source provenance and review state intact.
4. **Evaluate OCR as its own milestone:** compare a browser-local PDF.js + Tesseract.js path against other candidates using scanned synthetic reports. Keep OCR disabled by default until it passes a documented evaluation and manual-verification workflow.

## Reuse and safety rules

- Do not copy code just because a repository is public. Check the exact repository and file licence, preserve required notices and review dependencies before shipping them.
- MIT and Apache-2.0 components are permissive, but Apache-2.0 notices and licence text must be retained for redistributed components.
- MPL-2.0 has file-level source-disclosure obligations for covered modified files when distributed; review the licence before copying OpenELIS code.
- AGPL-3.0 has network-use source obligations; do not introduce Scribe.js into the MIT application without a deliberate compatibility decision.
- Never use real patient reports in public fixtures, screenshots, tests or CI. Synthetic fixtures are the default.
- No third-party parser or OCR output becomes a diagnosis, treatment recommendation or clinically verified result merely because a test passes.

## Source links

- [ParseLabs repository and README](https://github.com/tsilva/parselabs)
- [Medplum repository](https://github.com/medplum/medplum) and [FHIR TypeScript definitions](https://github.com/medplum/medplum/tree/main/packages/fhirtypes)
- [OpenELIS Global](https://openelis-global.org/) and the [open-source LIMS catalogue](https://github.com/DIGI-UW/awesome-lims)
- [Tesseract.js repository](https://github.com/naptha/tesseract.js), [worker guidance](https://github.com/naptha/tesseract.js/blob/master/docs/workers_vs_schedulers.md) and [PDF limitation](https://github.com/naptha/tesseract.js#project-scope)
- [Scribe.js repository](https://github.com/scribeocr/scribe.js) and [Tesseract comparison/licensing notes](https://github.com/scribeocr/scribe.js/blob/master/docs/scribe_vs_tesseract.md)
