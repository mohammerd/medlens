import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, CircleCheck, Crosshair, Download, FileCheck, FileText, Info, LockKeyhole, Upload, X } from "lucide-react";
import { formatBytes } from "../../lib/format";
import type { PdfTextExtraction } from "../../lib/pdf";
import { detectObservationCandidates, type ObservationCandidate } from "../../lib/candidate-extraction";
import { attachPdfSourceBounds } from "../../lib/source-linking";
import { buildReviewSummary, createReviewRecord } from "../../lib/review-record";
import SourcePdfViewer from "./SourcePdfViewer";

type Props = {
  onClose: () => void;
  onNotice: (title: string, message: string) => void;
};

export default function ReportIntake({ onClose, onNotice }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<PdfTextExtraction | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [candidates, setCandidates] = useState<ObservationCandidate[]>([]);
  const [candidatesAttempted, setCandidatesAttempted] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = file?.type === "application/pdf";
  const isImage = file?.type.startsWith("image/") ?? false;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    const supported = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!supported.includes(candidate.type)) {
      onNotice("Unsupported file", "Choose a PDF, PNG, JPG or WebP report.");
      return;
    }
    if (candidate.size > 15 * 1024 * 1024) {
      onNotice("File is too large", "The prototype accepts files up to 15 MB.");
      return;
    }
    setFile(candidate);
    setText("");
    setExtraction(null);
    setState("idle");
    setError(null);
    setReviewed(false);
    setCandidates([]);
    setCandidatesAttempted(false);
    setActiveCandidateId(null);
  };

  const extractLocally = async () => {
    if (!file || !isPdf) return;
    setState("reading");
    setError(null);
    setText("");
    setReviewed(false);
    setCandidates([]);
    setCandidatesAttempted(false);
    setActiveCandidateId(null);
    try {
      const { extractPdfText } = await import("../../lib/pdf");
      const result = await extractPdfText(file);
      setExtraction(result);
      setText(result.text);
      setState("done");
      if (!result.text) {
        setError("No selectable text was found. This may be a scanned PDF; OCR is not included in this frontend stage.");
      }
    } catch (caught) {
      setState("error");
      setError(caught instanceof Error ? caught.message : "The PDF could not be read in this browser.");
    }
  };

  const findCandidates = () => {
    const extractedCandidates = detectObservationCandidates(text);
    const detected = attachPdfSourceBounds(extractedCandidates, extraction?.lines ?? []);

    setCandidates(detected);
    setCandidatesAttempted(true);
    setActiveCandidateId(detected[0]?.sourceBounds.length ? detected[0].id : null);
    setReviewed(false);
  };

  const allCandidatesConfirmed = candidates.length > 0 && candidates.every((candidate) => candidate.confirmed);
  const reviewSummary = buildReviewSummary(candidates, extraction);

  const updateCandidate = (
    id: string,
    field: "reviewedTestName" | "reviewedValueAsReported" | "reviewedUnitAsReported" | "reviewedReferenceAsReported",
    value: string,
  ) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, [field]: value, confirmed: false } : candidate,
      ),
    );
    setReviewed(false);
    setActiveCandidateId(null);
  };

  const confirmReview = () => {
    if (!text.trim() || !allCandidatesConfirmed) return;
    setReviewed(true);
    onNotice("Text marked as reviewed", "This confirms that you checked the detected rows against the source. It is not clinical validation and remains in this browser session.");
  };

  const downloadReviewRecord = () => {
    if (!file || !reviewed || !allCandidatesConfirmed) return;

    const record = createReviewRecord(
      candidates,
      {
        mediaType: file.type,
        fileSizeBytes: file.size,
        sourceMode: isPdf ? "pdf-selectable-text" : "manual-transcription",
        totalPages: extraction?.totalPages ?? null,
        pagesRead: extraction?.pagesRead ?? null,
        truncated: extraction?.truncated ?? false,
      },
      extraction,
    );
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `medlens-review-record-${new Date().toISOString().slice(0, 10)}.json`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    onNotice("Review record downloaded", "The JSON includes report measurements and source text. Keep it private; use synthetic reports only in this prototype.");
  };

  const canEditText = (isPdf && state === "done") || isImage;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal upload-modal upload-modal-wide" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <div className="modal-heading">
          <div>
            <div className="panel-kicker">LOCAL DOCUMENT WORKSPACE</div>
            <h2 id="upload-title">Review a laboratory report</h2>
            <p>Preview the original and inspect its readable text before structured extraction.</p>
          </div>
          <button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </div>

        {!file && (
          <button
            className={dragActive ? "upload-dropzone upload-dropzone-active" : "upload-dropzone"}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => { event.preventDefault(); setDragActive(false); chooseFile(event.dataTransfer.files[0]); }}
          >
            <div className="upload-drop-icon"><Upload size={21} /></div>
            <strong>Drop your report here</strong>
            <span>or browse files from this device</span>
            <em>PDF, PNG, JPG or WebP · Up to 15 MB</em>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = ""; }}
        />

        {file && (
          <>
            <div className="selected-file-bar">
              <div className="selected-file-icon"><FileText size={17} /></div>
              <div className="selected-file-meta">
                <strong title={file.name}>{file.name}</strong>
                <span>{formatBytes(file.size)} · Selected on this device · Not uploaded</span>
              </div>
              <button className="button-secondary" onClick={() => inputRef.current?.click()}>Change file</button>
            </div>

            <div className="local-review-grid">
              <section className="local-review-panel">
                <div className="local-review-heading"><span>ORIGINAL DOCUMENT</span><span>LOCAL PREVIEW</span></div>
                {isPdf && (
                  <SourcePdfViewer
                    file={file}
                    totalPages={extraction?.totalPages ?? 1}
                    candidate={candidates.find((candidate) => candidate.id === activeCandidateId) ?? null}
                    onClearHighlight={() => setActiveCandidateId(null)}
                  />
                )}
                {isImage && (
                  <div className="local-preview-frame">
                    {previewUrl && <img src={previewUrl} alt="Selected laboratory report preview" />}
                  </div>
                )}
                {!isPdf && !isImage && (
                  <div className="local-preview-frame">
                    <div className="local-preview-placeholder"><FileText size={28} /><span>Preview unavailable for this file type.</span></div>
                  </div>
                )}
                <p className="local-panel-caption">The original file stays in this browser tab. Closing the tab clears this temporary preview.</p>
              </section>

              <section className="local-review-panel">
                <div className="local-review-heading"><span>READABLE TEXT</span><span>{isPdf ? "PDF TEXT LAYER" : "MANUAL TRANSCRIPTION"}</span></div>
                {isPdf && state === "idle" && (
                  <div className="extract-intro">
                    <div className="extract-intro-icon"><FileText size={18} /></div>
                    <strong>Read selectable PDF text</strong>
                    <p>Text is extracted locally in your browser. Scanned pages need OCR, which is not included yet.</p>
                    <button className="button-primary" onClick={extractLocally}><FileCheck size={15} /> Extract PDF text</button>
                  </div>
                )}
                {isPdf && state === "reading" && <div className="extract-state"><span className="loading-dot" /><strong>Reading PDF pages locally…</strong><span>This may take a moment for longer documents.</span></div>}
                {error && <div className="pdf-warning"><Info size={15} /><span>{error}</span></div>}
                {isPdf && state === "done" && extraction && (
                  <div className="extract-meta">
                    <span><Check size={13} /> {extraction.pagesRead} of {extraction.totalPages} pages checked</span>
                    {extraction.truncated && <span>50-page prototype limit</span>}
                  </div>
                )}
                {isImage && <div className="pdf-warning"><Info size={15} /><span>Automatic image OCR is not connected yet. You can manually transcribe visible text below to exercise the review interface.</span></div>}
                {canEditText && (
                  <>
                    <label className="text-field-label" htmlFor="report-source-text">{isPdf ? "Extracted text · editable for correction" : "Manual transcription · optional"}</label>
                    <textarea
                      id="report-source-text"
                      className="source-textarea"
                      value={text}
                      onChange={(event) => { setText(event.target.value); setReviewed(false); setCandidates([]); setCandidatesAttempted(false); setActiveCandidateId(null); }}
                      placeholder={isPdf ? "No selectable text was found. Scanned PDF OCR will be added in a later stage." : "Type or paste visible report text here. This is not OCR."}
                      spellCheck={false}
                    />
                    <div className="candidate-tool-row">
                      <div className="candidate-tool-copy">
                        <strong>Find possible result rows</strong>
                        <span>Conservative label matching · no medical classification</span>
                      </div>
                      <button className="button-secondary" disabled={!text.trim()} onClick={findCandidates}>Find rows</button>
                    </div>
                    {candidatesAttempted && (
                      <div className="candidate-review">
                        <div className="candidate-review-heading">
                          <strong>Candidate observations</strong>
                          <span>{candidates.length} detected</span>
                        </div>
                        {candidates.length === 0 ? (
                          <div className="candidate-empty">
                            No supported test rows were recognized. The detector only matches known labels at the start of a line; inspect the document manually.
                          </div>
                        ) : (
                          <div className="candidate-list">
                            {candidates.map((candidate) => (
                              <div className={candidate.confirmed ? "candidate-card candidate-card-confirmed" : "candidate-card"} key={candidate.id} role="group" aria-label={"Review " + candidate.testName + " candidate"}>
                                <input
                                  type="checkbox"
                                  checked={candidate.confirmed}
                                  aria-label={"Confirm " + candidate.reviewedTestName + " extraction"}
                                  onChange={(event) => {
                                    setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, confirmed: event.target.checked } : item));
                                    setReviewed(false);
                                  }}
                                />
                                <div className="candidate-card-body">
                                  <div className="candidate-card-top">
                                    <strong>Review extracted observation</strong>
                                    <span>Page {candidate.page} · line {candidate.line}</span>
                                  </div>
                                  <div className="candidate-source-action">
                                    <span>{candidate.sourceBounds.length > 0 ? "Original text geometry available" : "No precise highlight available"}</span>
                                    <button
                                      type="button"
                                      className="source-jump-button"
                                      disabled={candidate.sourceBounds.length === 0}
                                      aria-pressed={activeCandidateId === candidate.id}
                                      onClick={() => setActiveCandidateId(candidate.id)}
                                    >
                                      {activeCandidateId === candidate.id ? "Highlighted" : "View source"}
                                      <Crosshair size={12} />
                                    </button>
                                  </div>
                                  <label className="candidate-field candidate-name-field">
                                    <small>TEST NAME</small>
                                    <input
                                      className="candidate-edit-input"
                                      value={candidate.reviewedTestName}
                                      onChange={(event) => updateCandidate(candidate.id, "reviewedTestName", event.target.value)}
                                    />
                                  </label>
                                  <div className="candidate-values candidate-edit-values">
                                    <label className="candidate-field">
                                      <small>REPORTED VALUE</small>
                                      <input
                                        className="candidate-edit-input"
                                        value={candidate.reviewedValueAsReported}
                                        onChange={(event) => updateCandidate(candidate.id, "reviewedValueAsReported", event.target.value)}
                                      />
                                    </label>
                                    <label className="candidate-field">
                                      <small>UNIT</small>
                                      <input
                                        className="candidate-edit-input"
                                        value={candidate.reviewedUnitAsReported}
                                        placeholder="Missing"
                                        onChange={(event) => updateCandidate(candidate.id, "reviewedUnitAsReported", event.target.value)}
                                      />
                                    </label>
                                    <label className="candidate-field">
                                      <small>PRINTED RANGE</small>
                                      <input
                                        className="candidate-edit-input"
                                        value={candidate.reviewedReferenceAsReported}
                                        placeholder="Not captured"
                                        onChange={(event) => updateCandidate(candidate.id, "reviewedReferenceAsReported", event.target.value)}
                                      />
                                    </label>
                                  </div>
                                  <div className="candidate-source-line"><span>ORIGINAL SOURCE LINE</span><p>{candidate.rawLine}</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <section className="review-quality-summary" aria-label="Review quality summary">
                          <div className="review-quality-heading">
                            <div><span>REVIEW QUALITY SUMMARY</span><strong>{reviewSummary.confirmedCount} of {reviewSummary.candidateCount} detected rows confirmed</strong></div>
                            <span>Local review only</span>
                          </div>
                          <div className="review-quality-metrics">
                            <div><strong>{reviewSummary.pendingCount}</strong><span>Awaiting confirmation</span></div>
                            <div><strong>{reviewSummary.missingUnitRows.length}</strong><span>Missing units</span></div>
                            <div><strong>{reviewSummary.missingReferenceIntervalRows.length}</strong><span>Missing printed intervals</span></div>
                            <div><strong>{reviewSummary.missingSourceHighlightRows.length}</strong><span>Source highlights unavailable</span></div>
                            <div><strong>{reviewSummary.pagesWithoutSelectableText}</strong><span>Pages without selectable text</span></div>
                            <div><strong>{reviewSummary.unmatchedSelectableLineCount}</strong><span>Other extracted text lines</span></div>
                            <div><strong>{reviewSummary.potentialConflicts.length}</strong><span>Potential conflicting label groups</span></div>
                          </div>
                          {reviewSummary.potentialConflicts.map((conflict) => (
                            <div className="review-quality-warning" role="note" key={conflict.key}>
                              <CircleAlert size={14} />
                              <span><strong>Check repeated values:</strong> {conflict.testName} appears on page {conflict.page} with different reported values ({conflict.values.join(" / ")}). Confirm whether these are separate samples. MEDLENS does not choose or merge values.</span>
                            </div>
                          ))}
                          {reviewSummary.pagesWithoutSelectableText > 0 && (
                            <p className="review-quality-footnote"><Info size={13} /> Some pages have no selectable PDF text. This may occur with scans or image-only pages; OCR is not included.</p>
                          )}
                          {reviewSummary.unmatchedSelectableLineCount > 0 && (
                            <p className="review-quality-footnote"><Info size={13} /> Other extracted lines were not matched by this limited test-label detector. They may still contain relevant report content; inspect the original document.</p>
                          )}
                          {candidates.length === 0 && (
                            <p className="review-quality-footnote"><Info size={13} /> No supported rows were recognized. This does not mean the report contains no results; inspect every original page manually.</p>
                          )}
                          {extraction?.truncated && (
                            <p className="review-quality-footnote"><Info size={13} /> The prototype stopped after 50 pages. Remaining pages were not processed.</p>
                          )}
                        </section>
                        <p className="candidate-safety-note">These are text-pattern matches, not validated clinical observations. Confirm each row against the original report. No normal, high or low judgement is made.</p>
                      </div>
                    )}
                    <div className="review-confirm-row">
                      <div className={reviewed ? "review-confirm-state is-reviewed" : "review-confirm-state"}>
                        {reviewed ? <CircleCheck size={15} /> : <Info size={15} />}
                        <span>{reviewed ? "Rows checked in this browser session" : allCandidatesConfirmed ? "All detected rows checked against source" : "Check every detected row against the original"}</span>
                      </div>
                      <div className="review-confirm-actions">
                        <button className="button-secondary" disabled={!allCandidatesConfirmed || reviewed} onClick={confirmReview}>{reviewed ? "Reviewed" : "Confirm review"}</button>
                        {reviewed && <button className="button-secondary review-export-button" onClick={downloadReviewRecord}><Download size={13} /> Download JSON</button>}
                      </div>
                    </div>
                    {reviewed && <p className="review-export-caution">The JSON contains extracted measurements and source text. Keep the downloaded file private. This prototype is for synthetic data only.</p>}
                  </>
                )}
                {isPdf && state === "error" && <button className="button-secondary retry-extract" onClick={extractLocally}>Try PDF extraction again</button>}
                {!isPdf && !isImage && <div className="local-preview-placeholder"><Info size={20} /><span>This file type is not supported.</span></div>}
              </section>
            </div>
          </>
        )}

        <div className="upload-local-note">
          <LockKeyhole size={15} />
          <span><strong>Local-only prototype.</strong> PDF text extraction runs in your browser. A reviewed JSON record can be downloaded to this device, but no report is uploaded or stored by MEDLENS. No OCR or medical interpretation occurs. Use synthetic reports only.</span>
        </div>
        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose}>Close</button>
          <button
            className="button-primary"
            disabled={!file || !reviewed}
            onClick={() => { onClose(); onNotice("Local review complete", "The source file and in-memory text were cleared from this session. Any JSON export remains in your device's downloads. No report was uploaded."); }}
          >
            Confirm local review <Check size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
