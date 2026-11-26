# Local report extraction: scope and limitations

This document describes the current frontend-only report workflow. It is an engineering experiment, not a validated medical document extraction system.

## What currently works

- Select PDF, PNG, JPG or WebP files up to 15 MB.
- Preview the selected file using a temporary browser object URL.
- Read selectable text from PDF files with Mozilla PDF.js 6.x, in the browser.
- Group PDF text fragments by approximate visual baseline before presenting page lines; this helps common table rows but is not complete table reconstruction.
- Preserve page markers and extracted text lines in the review panel.
- Run conservative label-at-line-start matching for a limited set of FBC, lipid and glucose test names.
- Display the reported value, any text following it that resembles a unit, a printed numeric range when found, the raw matched line, and page/line position.
- Highlight the approximate PDF.js text-fragment rectangles associated with a selected candidate on its original page.
- Allow users to correct the detected test name, value, unit and printed interval while preserving the original source line.
- Clear a row's confirmation whenever a correction is edited.
- Require a user to check every detected candidate row before marking the review step complete.
- Show a review-quality summary for missing units/intervals, unavailable highlights, differing repeated labels, pages without selectable text and lines outside the limited detector.
- Download a versioned JSON record that keeps extracted values separate from reviewer-corrected values and includes raw source line, page/line and approximate highlight bounds.

## What it does not do

- It does not upload files, store report contents, call an API or use an LLM.
- It does not OCR scanned PDFs or image reports. Images can only be previewed and manually transcribed at this stage.
- Baseline grouping does not reliably reconstruct arbitrary laboratory tables, multi-column layouts, rotated pages, handwritten entries or split labels and values.
- It does not normalize units, convert decimal separators, infer missing reference ranges or reconcile different laboratory methods.
- It does not calculate high/low/normal flags, diagnose disease, estimate risk or recommend treatment.
- It does not create server-persisted structured observations or audit records. JSON review exports are downloaded to the user's device and are not retained by the application.

## Candidate detector behaviour

The detector is deliberately conservative. It matches known labels only at the beginning of an extracted text line and only creates a candidate when a numeric token follows. It tries to preserve the first numeric token, trailing unit text, a numeric interval if one appears later on the same line, the original line and an approximate page/line position.

A source highlight is a navigation aid, not proof of extraction accuracy. A candidate is not a verified result. A matching label may still be wrong because of OCR/text-layer ordering, table structure, abbreviation collisions or unrelated text. The user must compare the entire raw line with the original document. The detector must never turn its output into a clinical interpretation.

The supported labels are a starter list, not a clinical terminology catalogue. The aliases need to be tested against a legally usable, diverse corpus of laboratory reports before expanding support.

## Validation plan before broader use

1. Build a synthetic and appropriately licensed/de-identified test corpus with varied report templates.
2. Have trained annotators independently label test name, value, original unit, reference interval, page and bounding box.
3. Adjudicate disagreements and maintain a versioned gold dataset.
4. Measure per-field precision, recall and exact-match accuracy, not only whether a row was found.
5. Report failures by laboratory template, scan quality, language and document layout.
6. Add OCR only with its own confidence and error evaluation; OCR confidence must remain separate from clinical certainty.
7. Obtain qualified laboratory-scientist and clinician review before any patient-facing clinical pilot.

## Privacy

The browser preview uses temporary object URLs and in-memory component state. Closing the workflow releases the object URL; refreshing or closing the tab clears the local session. Do not use real patient reports in this prototype. Formal privacy, security, ethics and institutional review are required before processing identifiable health information.
