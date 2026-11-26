import { useEffect, useRef, useState } from "react";
import { Check, CircleCheck, FileCheck, FileText, Info, LockKeyhole, Upload, X } from "lucide-react";
import { formatBytes } from "../../lib/format";
import { extractPdfText, type PdfTextExtraction } from "../../lib/pdf";
import { detectObservationCandidates, type ObservationCandidate } from "../../lib/candidate-extraction";

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
  };

  const extractLocally = async () => {
    if (!file || !isPdf) return;
    setState("reading");
    setError(null);
    setText("");
    setReviewed(false);
    setCandidates([]);
    setCandidatesAttempted(false);
    try {
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
    setCandidates(detectObservationCandidates(text));
    setCandidatesAttempted(true);
    setReviewed(false);
  };

  const allCandidatesConfirmed = candidates.length > 0 && candidates.every((candidate) => candidate.confirmed);

  const confirmReview = () => {
    if (!text.trim() || !allCandidatesConfirmed) return;
    setReviewed(true);
    onNotice("Text marked as reviewed", "This confirmation exists only in this browser session. Nothing has been saved or uploaded.");
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
                <div className="local-preview-frame">
                  {isPdf && previewUrl && <iframe src={previewUrl} title={"Local preview of " + file.name} />}
                  {isImage && previewUrl && <img src={previewUrl} alt="Selected laboratory report preview" />}
                  {!isPdf && !isImage && <div className="local-preview-placeholder"><FileText size={28} /><span>Preview unavailable for this file type.</span></div>}
                </div>
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
                      onChange={(event) => { setText(event.target.value); setReviewed(false); setCandidates([]); setCandidatesAttempted(false); }}
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
                              <label className={candidate.confirmed ? "candidate-card candidate-card-confirmed" : "candidate-card"} key={candidate.id}>
                                <input
                                  type="checkbox"
                                  checked={candidate.confirmed}
                                  onChange={(event) => {
                                    setCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, confirmed: event.target.checked } : item));
                                    setReviewed(false);
                                  }}
                                />
                                <div className="candidate-card-body">
                                  <div className="candidate-card-top">
                                    <strong>{candidate.testName}</strong>
                                    <span>Page {candidate.page} · line {candidate.line}</span>
                                  </div>
                                  <div className="candidate-values">
                                    <span><small>REPORTED VALUE</small><strong>{candidate.valueAsReported}</strong></span>
                                    <span><small>UNIT</small><strong>{candidate.unitAsReported || "Not captured"}</strong></span>
                                    <span><small>PRINTED RANGE</small><strong>{candidate.referenceAsReported || "Not found"}</strong></span>
                                  </div>
                                  <p>{candidate.rawLine}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                        <p className="candidate-safety-note">These are text-pattern matches, not validated clinical observations. Confirm each row against the original report. No normal, high or low judgement is made.</p>
                      </div>
                    )}
                    <div className="review-confirm-row">
                      <div className={reviewed ? "review-confirm-state is-reviewed" : "review-confirm-state"}>
                        {reviewed ? <CircleCheck size={15} /> : <Info size={15} />}
                        <span>{reviewed ? "Marked reviewed in this session" : allCandidatesConfirmed ? "All detected rows checked against source" : "Check every detected row against the original"}</span>
                      </div>
                      <button className="button-secondary" disabled={!allCandidatesConfirmed} onClick={confirmReview}>{reviewed ? "Reviewed" : "Confirm review"}</button>
                    </div>
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
          <span><strong>Local-only prototype.</strong> PDF text extraction runs in your browser. No OCR, medical interpretation, API request, account storage or upload occurs. Do not use real patient reports in this research prototype.</span>
        </div>
        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose}>Close</button>
          <button
            className="button-primary"
            disabled={!file || !reviewed}
            onClick={() => { onClose(); onNotice("Local review complete", "Your text review is only held in this browser session. It has not been saved or sent anywhere."); }}
          >
            Confirm local review <Check size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
