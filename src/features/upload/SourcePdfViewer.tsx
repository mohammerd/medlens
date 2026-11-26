import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Crosshair, FileText, LoaderCircle } from "lucide-react";
import type { ObservationCandidate } from "../../lib/candidate-extraction";

type Props = {
  file: File;
  totalPages: number;
  candidate: ObservationCandidate | null;
  onClearHighlight: () => void;
};

type RenderedPage = {
  dataUrl: string;
  width: number;
  height: number;
  pageCount: number;
};

export default function SourcePdfViewer({
  file,
  totalPages,
  candidate,
  onClearHighlight,
}: Props) {
  const [pageNumber, setPageNumber] = useState(1);
  const [renderedPage, setRenderedPage] = useState<RenderedPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderSequence = useRef(0);

  useEffect(() => {
    setPageNumber(1);
    setRenderedPage(null);
    onClearHighlight();
  }, [file]);

  useEffect(() => {
    if (candidate && candidate.page !== pageNumber) {
      setPageNumber(candidate.page);
    }
  }, [candidate?.id, candidate?.page]);

  useEffect(() => {
    let cancelled = false;
    const sequence = ++renderSequence.current;

    setLoading(true);
    setError(null);
    setRenderedPage(null);

    void import("../../lib/pdf")
      .then(({ renderPdfPage }) => renderPdfPage(file, pageNumber))
      .then((result) => {
        if (cancelled || sequence !== renderSequence.current) return;
        setRenderedPage(result);
      })
      .catch((caught: unknown) => {
        if (cancelled || sequence !== renderSequence.current) return;
        setError(caught instanceof Error ? caught.message : "The PDF page could not be rendered.");
      })
      .finally(() => {
        if (!cancelled && sequence === renderSequence.current) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file, pageNumber]);

  const displayPageCount = Math.max(totalPages, renderedPage?.pageCount ?? 1);
  const visibleCandidate = candidate?.page === pageNumber ? candidate : null;
  const highlightCount = visibleCandidate?.sourceBounds.length ?? 0;

  const changePage = (nextPage: number) => {
    setPageNumber(Math.min(displayPageCount, Math.max(1, nextPage)));
    onClearHighlight();
  };

  return (
    <div className="source-pdf-viewer">
      <div className="source-pdf-toolbar">
        <div className="source-pdf-toolbar-meta">
          <div className="source-pdf-page-count">
            <FileText size={13} />
            <span>DOCUMENT PREVIEW</span>
          </div>
          <div className="source-pdf-page-position">
            <strong>{pageNumber}</strong><span>of {displayPageCount} pages</span>
          </div>
        </div>
        <div className="source-pdf-page-controls">
          <button
            className="icon-button source-pdf-page-button"
            type="button"
            aria-label="Previous PDF page"
            disabled={pageNumber <= 1 || loading}
            onClick={() => changePage(pageNumber - 1)}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            className="icon-button source-pdf-page-button"
            type="button"
            aria-label="Next PDF page"
            disabled={pageNumber >= displayPageCount || loading}
            onClick={() => changePage(pageNumber + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div
        className="source-pdf-progress"
        role="progressbar"
        aria-label="PDF page position"
        aria-valuemin={1}
        aria-valuemax={displayPageCount}
        aria-valuenow={pageNumber}
      >
        <span style={{ width: `${(pageNumber / displayPageCount) * 100}%` }} />
      </div>

      <div className="source-pdf-canvas">
        {loading && (
          <div className="source-pdf-state" role="status">
            <LoaderCircle size={19} className="source-pdf-spinner" />
            <span>Rendering page locally…</span>
          </div>
        )}
        {error && (
          <div className="source-pdf-state source-pdf-error" role="alert">
            <FileText size={20} />
            <span>{error}</span>
          </div>
        )}
        {renderedPage && !loading && !error && (
          <div
            className="source-pdf-page-stage"
            style={{ aspectRatio: `${renderedPage.width} / ${renderedPage.height}` }}
          >
            <img
              src={renderedPage.dataUrl}
              alt={`Laboratory report page ${pageNumber}`}
              draggable={false}
            />
            {visibleCandidate?.sourceBounds.map((bounds, index) => (
              <div
                className="pdf-source-highlight"
                key={`${visibleCandidate.id}-${index}`}
                style={{
                  left: `${bounds.x * 100}%`,
                  top: `${bounds.y * 100}%`,
                  width: `${bounds.width * 100}%`,
                  height: `${bounds.height * 100}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="source-pdf-caption" aria-live="polite">
        {visibleCandidate && highlightCount > 0 ? (
          <>
            <Crosshair size={13} />
            <span>
              Highlighting {visibleCandidate.reviewedTestName} · source line {visibleCandidate.line}
              {highlightCount > 1 ? ` · ${highlightCount} text fragments` : ""}
            </span>
          </>
        ) : visibleCandidate ? (
          <>
            <FileText size={13} />
            <span>Page found, but text geometry was unavailable. Compare the source line manually.</span>
          </>
        ) : (
          <>
            <Crosshair size={13} />
            <span>Select “View source” on a detected observation to highlight its original text.</span>
          </>
        )}
      </div>
    </div>
  );
}
