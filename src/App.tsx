import { useMemo, useRef, useState } from "react";
import {
  Activity,
  CircleAlert,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CircleCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileCheck,
  FileText,
  FlaskConical,
  FolderOpen,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Moon,
  Ellipsis,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { demoReports, demoResultsByReport, trendPoints, type LabReport, type LabResult } from "./data/demo";
import { formatBytes } from "./lib/format";

type View = "Overview" | "Reports" | "Trends" | "Evidence library";
type Notice = { title: string; message: string } | null;

const navigation: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Reports", icon: FileText },
  { label: "Trends", icon: TrendingUp },
  { label: "Evidence library", icon: BookOpen },
];

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><Activity size={19} strokeWidth={2.4} /></div>
      <div className="brand-copy">
        <span>MEDLENS</span>
        <small>LAB INTELLIGENCE</small>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: LabReport["status"] }) {
  const styles = {
    Reviewed: "pill-green",
    "Needs review": "pill-amber",
    Demo: "pill-muted",
  };
  return <span className={`status-pill ${styles[status]}`}><span className="status-dot" />{status}</span>;
}

function ResultStatus({ status }: { status: LabResult["status"] }) {
  if (status === "within") return <span className="result-status result-ok"><CircleCheck size={13} /> Within example range</span>;
  if (status === "review") return <span className="result-status result-review"><CircleAlert size={13} /> Verify result</span>;
  return <span className="result-status result-muted"><Info size={13} /> Not available</span>;
}

function TrendChart() {
  const width = 650;
  const height = 188;
  const min = 11.8;
  const max = 13.8;
  const points = trendPoints.map((point, index) => {
    const x = 34 + (index * (width - 68)) / (trendPoints.length - 1);
    const y = height - 24 - ((point.value - min) / (max - min)) * (height - 50);
    return { ...point, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `34,${height - 24} ${line} ${width - 34},${height - 24}`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Illustrative synthetic haemoglobin trend from June to November">
        {[0, 1, 2, 3].map((row) => {
          const y = 24 + row * 44;
          return <g key={row}><line x1="34" x2={width - 34} y1={y} y2={y} className="chart-grid" /><text x="0" y={y + 4} className="chart-axis">{(13.8 - row * 0.6).toFixed(1)}</text></g>;
        })}
        <polygon points={area} className="chart-area" />
        <polyline points={line} className="chart-line" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" className="chart-point" />
            <text x={point.x} y={height - 4} textAnchor="middle" className="chart-axis">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>("Overview");
  const [dark, setDark] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [selectedResult, setSelectedResult] = useState<LabResult>(demoResults[0]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reportResults = selectedReport ? (demoResultsByReport[selectedReport.id] ?? []) : [];

  const filteredReports = useMemo(
    () => demoReports.filter((report) => `${report.title} ${report.category} ${report.laboratory}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const announce = (title: string, message: string) => {
    setNotice({ title, message });
    window.setTimeout(() => setNotice(null), 4600);
  };

  const openReport = (report: LabReport) => {
    setSelectedReport(report);
    setSelectedResult(demoResultsByReport[report.id]?.[0] ?? demoResultsByReport["report-cbc-01"][0]);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const accepted = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!accepted.includes(file.type)) {
      announce("Unsupported file", "Choose a PDF, PNG, JPG or WebP report.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      announce("File is too large", "The prototype accepts files up to 15 MB for local selection.");
      return;
    }
    setSelectedFile(file);
  };

  const nav = (
    <>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {navigation.map(({ label, icon: Icon }) => (
          <button
            className={`nav-item ${view === label ? "nav-item-active" : ""}`}
            key={label}
            onClick={() => { setView(label); setMobileNavOpen(false); }}
          >
            <Icon size={17} strokeWidth={1.9} />
            <span>{label}</span>
            {label === "Reports" && <span className="nav-count">3</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-section-label sidebar-section-spaced">PREFERENCES</div>
      <button className="nav-item" onClick={() => announce("Settings", "Account and privacy settings will be added with the authenticated backend.")}>
        <Settings2 size={17} /><span>Settings</span>
      </button>
      <button className="nav-item" onClick={() => announce("Help centre", "Documentation and support links are being prepared.")}>
        <CircleHelp size={17} /><span>Help centre</span>
      </button>
    </>
  );

  return (
    <div className={`app-shell ${dark ? "theme-dark" : ""}`}>
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">D</div>
          <div className="workspace-meta"><strong>Demo workspace</strong><span>Personal space</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        {nav}
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <div className="privacy-card-icon"><ShieldCheck size={16} /></div>
            <div><strong>Privacy by design</strong><p>Your data should remain under your control.</p></div>
            <LockKeyhole size={14} className="privacy-lock" />
          </div>
          <div className="profile-row">
            <div className="profile-avatar">MD</div>
            <div className="profile-meta"><strong>Demo patient</strong><span>Prototype account</span></div>
            <Ellipsis size={18} className="muted-icon" />
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={13} /><strong>{view}</strong></div>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <input aria-label="Search reports" placeholder="Search reports..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <kbd>/</kbd>
            </label>
            <button className="icon-button theme-toggle" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => announce("You're all caught up", "There are no new notifications in this demo workspace.")}><Bell size={18} /><span /></button>
            <div className="topbar-avatar">MD</div>
          </div>
        </header>

        <main className="page-content">
          <div className="prototype-banner"><span className="prototype-pulse" /><strong>RESEARCH PROTOTYPE</strong><span>Sample records only · No clinical analysis is active</span><button onClick={() => announce("Prototype scope", "This interface uses synthetic example data. File selection is local-only; no report is uploaded or interpreted.")}>What does this mean? <ArrowRight size={12} /></button></div>

          {view === "Overview" && (
            <>
              <section className="page-heading">
                <div><div className="eyebrow">THURSDAY, 26 NOVEMBER 2026</div><h1>Your health workspace<span className="heading-period">.</span></h1><p>A clearer view of your laboratory information, one report at a time.</p></div>
                <button className="button-primary" onClick={() => { setUploadOpen(true); setSelectedFile(null); }}><Plus size={17} /> Add a report</button>
              </section>

              <section className="metric-grid" aria-label="Workspace summary">
                <div className="metric-card"><div className="metric-top"><span>Reports in workspace</span><div className="metric-icon metric-icon-sage"><FileText size={17} /></div></div><div className="metric-value">03</div><div className="metric-foot"><span className="metric-neutral"><FolderOpen size={13} /> Example records</span><span className="metric-caption">Synthetic data</span></div></div>
                <div className="metric-card"><div className="metric-top"><span>Results to verify</span><div className="metric-icon metric-icon-amber"><CircleAlert size={17} /></div></div><div className="metric-value">01</div><div className="metric-foot"><span className="metric-neutral">Manual review queue</span><span className="metric-caption">Demo only</span></div></div>
                <div className="metric-card"><div className="metric-top"><span>Tracked measurements</span><div className="metric-icon metric-icon-blue"><Activity size={17} /></div></div><div className="metric-value">06</div><div className="metric-foot"><span className="metric-neutral"><TrendingUp size={13} /> Example timeline</span><span className="metric-caption">Not clinical data</span></div></div>
                <div className="metric-card metric-card-dark"><div className="metric-top"><span>Evidence coverage</span><div className="metric-icon metric-icon-dark"><BookOpen size={17} /></div></div><div className="metric-value">—</div><div className="metric-foot"><span className="metric-neutral">Source connectors</span><span className="metric-caption">Not configured</span></div></div>
              </section>

              <section className="content-grid">
                <div className="panel reports-panel">
                  <div className="panel-heading"><div><div className="panel-kicker">YOUR DOCUMENTS</div><h2>Recent reports</h2><p>Review the documents in this demonstration workspace.</p></div><button className="text-action" onClick={() => setView("Reports")}>View all <ArrowRight size={14} /></button></div>
                  <div className="reports-table-wrap">
                    <table className="reports-table">
                      <thead><tr><th>REPORT</th><th>DATE ADDED</th><th>STATUS</th><th aria-label="Open report" /></tr></thead>
                      <tbody>
                        {filteredReports.slice(0, 4).map((report) => (
                          <tr key={report.id} onClick={() => openReport(report)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") openReport(report); }}>
                            <td><div className="report-cell"><div className={`report-file-icon file-${report.color}`}><FileText size={17} /></div><div><strong>{report.title}</strong><span>{report.category} · {report.results} values</span></div></div></td>
                            <td className="date-cell">{report.date}</td><td><StatusPill status={report.status} /></td><td><button className="row-arrow" aria-label={`Open ${report.title}`}><ChevronRight size={17} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredReports.length === 0 && <div className="empty-state"><Search size={20} /><strong>No matching reports</strong><span>Try another search term.</span></div>}
                  </div>
                  <div className="panel-footer"><span><span className="tiny-dot" /> Demonstration records</span><span>3 reports total</span></div>
                </div>

                <div className="right-rail">
                  <div className="panel review-panel">
                    <div className="panel-heading compact-heading"><div><div className="panel-kicker">ATTENTION</div><h2>Review queue</h2></div><span className="queue-count">01</span></div>
                    <div className="review-item"><div className="review-icon"><CircleAlert size={17} /></div><div className="review-copy"><strong>One result needs checking</strong><p>Lipid Profile · Reference interval requires confirmation in this sample record.</p><button onClick={() => openReport(demoReports[1])}>Review report <ArrowRight size={13} /></button></div></div>
                    <div className="review-note"><Info size={14} /><span>This is a simulated workflow. It does not identify a real health risk.</span></div>
                  </div>
                  <div className="panel getting-started">
                    <div className="getting-icon"><Sparkles size={17} /></div><div className="panel-kicker">BUILT AROUND CLARITY</div><h3>Understand the source before the summary.</h3><p>MEDLENS is being designed to connect every extracted value to its original report location.</p><button className="text-action" onClick={() => setView("Evidence library")}>Explore the approach <ArrowRight size={14} /></button>
                  </div>
                </div>
              </section>

              <section className="panel trend-panel">
                <div className="panel-heading"><div><div className="panel-kicker">LONGITUDINAL VIEW</div><h2>Measurement timeline</h2><p>An example of how compatible results could be compared over time.</p></div><div className="trend-legend"><span /><span>Illustrative HGB values</span></div></div>
                <div className="trend-summary"><div><span className="trend-number">13.4 <small>g/dL</small></span><span className="trend-subtext">Latest synthetic value</span></div><div className="trend-change"><ArrowUpRight size={15} /> +0.8 <small>illustrative change</small></div></div>
                <TrendChart />
                <div className="chart-disclaimer"><Info size={13} /> All plotted values are fabricated for interface demonstration. No personal trend is being analysed.</div>
              </section>
            </>
          )}

          {view === "Reports" && (
            <>
              <section className="page-heading"><div><div className="eyebrow">DOCUMENT LIBRARY</div><h1>Reports<span className="heading-period">.</span></h1><p>Browse and inspect the synthetic reports in this workspace.</p></div><button className="button-primary" onClick={() => { setUploadOpen(true); setSelectedFile(null); }}><Plus size={17} /> Add a report</button></section>
              <div className="panel full-panel"><div className="list-toolbar"><div><strong>All reports</strong><span>{filteredReports.length} example documents</span></div><button className="button-secondary" onClick={() => announce("Filters", "Advanced report filters will be available when report metadata is connected.")}><Settings2 size={15} /> Filters</button></div>
                {filteredReports.map((report) => <button className="report-list-row" key={report.id} onClick={() => openReport(report)}><div className={`report-file-icon file-${report.color}`}><FileText size={18} /></div><div className="report-list-main"><strong>{report.title}</strong><span>{report.category} · {report.laboratory}</span></div><span className="date-cell">{report.date}</span><StatusPill status={report.status} /><ChevronRight size={17} className="muted-icon" /></button>)}
                {filteredReports.length === 0 && <div className="empty-state"><Search size={20} /><strong>No matching reports</strong><span>Try another search term.</span></div>}
              </div>
            </>
          )}

          {view === "Trends" && (
            <>
              <section className="page-heading"><div><div className="eyebrow">LONGITUDINAL INTELLIGENCE</div><h1>Measurement trends<span className="heading-period">.</span></h1><p>Explore how MEDLENS will compare compatible measurements across reports.</p></div><span className="prototype-tag"><History size={14} /> Synthetic timeline</span></section>
              <div className="insight-banner"><div className="insight-banner-icon"><Info size={18} /></div><div><strong>Comparisons need context.</strong><p>Different laboratories, methods, units and reference intervals can make two results non-comparable. This prototype chart uses fabricated values only.</p></div></div>
              <section className="panel trend-panel trend-panel-large"><div className="panel-heading"><div><div className="panel-kicker">EXAMPLE MEASUREMENT</div><h2>Haemoglobin (HGB)</h2><p>Illustrative values from June to November.</p></div><span className="trend-chip">6 synthetic points</span></div><div className="trend-summary"><div><span className="trend-number">13.4 <small>g/dL</small></span><span className="trend-subtext">Example latest value · 12 Nov 2026</span></div><div className="trend-change"><ArrowUpRight size={15} /> +0.8 <small>across sample period</small></div></div><TrendChart /><div className="chart-disclaimer"><Info size={13} /> No health status, diagnosis or treatment implication can be inferred from this fabricated chart.</div></section>
              <div className="panel trend-method"><div className="panel-kicker">COMPARISON RULES WE ARE BUILDING</div><div className="method-grid"><div><CircleCheck size={17} /><strong>Match the test</strong><p>Compare equivalent measurements, not just similar labels.</p></div><div><CircleCheck size={17} /><strong>Normalize carefully</strong><p>Preserve the original unit and document any conversion.</p></div><div><CircleCheck size={17} /><strong>Keep the range</strong><p>Retain the reference interval from each reporting laboratory.</p></div></div></div>
            </>
          )}

          {view === "Evidence library" && (
            <>
              <section className="page-heading"><div><div className="eyebrow">PROVENANCE & REFERENCES</div><h1>Evidence library<span className="heading-period">.</span></h1><p>A transparent record of the sources that support each explanation.</p></div><span className="prototype-tag"><LockKeyhole size={14} /> Not connected</span></section>
              <div className="insight-banner"><div className="insight-banner-icon"><ShieldCheck size={18} /></div><div><strong>No medical evidence source is connected in this prototype.</strong><p>We will not invent citations or present generated explanations as medically verified. This area will show reviewed references and their version history once the evidence service exists.</p></div></div>
              <div className="evidence-grid">
                <div className="panel evidence-card"><div className="evidence-icon"><BookOpen size={19} /></div><span className="evidence-type">TERMINOLOGY</span><h3>Laboratory test definitions</h3><p>Stable identifiers and carefully reviewed plain-language descriptions for supported tests.</p><span className="evidence-state"><span /> Planned source integration</span></div>
                <div className="panel evidence-card"><div className="evidence-icon"><FlaskConical size={19} /></div><span className="evidence-type">LABORATORY CONTEXT</span><h3>Units & reference intervals</h3><p>Original laboratory ranges, units, specimen information and method context.</p><span className="evidence-state"><span /> Planned validation layer</span></div>
                <div className="panel evidence-card"><div className="evidence-icon"><ShieldCheck size={19} /></div><span className="evidence-type">CLINICAL REVIEW</span><h3>Reviewed explanation sources</h3><p>Versioned sources reviewed by qualified professionals, with clear provenance.</p><span className="evidence-state"><span /> Clinical review required</span></div>
              </div>
              <div className="panel evidence-principle"><div className="evidence-principle-icon"><LockKeyhole size={17} /></div><div><strong>Evidence is not decoration.</strong><p>Each future explanation should identify its supporting source, version, retrieval date and the exact statement it supports.</p></div></div>
            </>
          )}

          <footer className="app-footer"><span>MEDLENS <span>·</span> Open-source research prototype</span><span><ShieldCheck size={13} /> Privacy-first by design</span><button onClick={() => announce("About MEDLENS", "An open-source project exploring traceable, uncertainty-aware laboratory report explanations.")}>About this project <ArrowUpRight size={12} /></button></footer>
        </main>
      </div>

      {uploadOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadOpen(false); }}>
          <section className="modal upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="modal-heading"><div><div className="panel-kicker">ADD TO WORKSPACE</div><h2 id="upload-title">Select a laboratory report</h2><p>Choose a PDF or image to explore the planned upload experience.</p></div><button className="icon-button" aria-label="Close dialog" onClick={() => setUploadOpen(false)}><X size={18} /></button></div>
            <button className="upload-dropzone" onClick={() => fileInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]); }}>
              <div className="upload-drop-icon"><Upload size={21} /></div><strong>{selectedFile ? selectedFile.name : "Drop your report here"}</strong><span>{selectedFile ? `${formatBytes(selectedFile.size)} · Selected on this device` : "or browse files from this device"}</span><em>PDF, PNG, JPG or WebP · Up to 15 MB</em>
            </button>
            <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
            <div className="upload-local-note"><LockKeyhole size={15} /><span><strong>Local selection only.</strong> This frontend has no backend connection yet. Your file is not uploaded, stored or analysed.</span></div>
            <div className="modal-actions"><button className="button-secondary" onClick={() => setUploadOpen(false)}>Cancel</button><button className="button-primary" disabled={!selectedFile} onClick={() => { setUploadOpen(false); announce("Prototype limitation", "The file was selected locally, but upload and report processing are not implemented yet. No file was sent anywhere."); }}>Continue <ArrowRight size={15} /></button></div>
          </section>
        </div>
      )}

      {selectedReport && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReport(null); }}>
          <section className="report-drawer" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <div className="drawer-header"><div><div className="panel-kicker">SAMPLE REPORT · {selectedReport.date.toUpperCase()}</div><h2 id="report-title">{selectedReport.title}</h2><p>{selectedReport.laboratory} · {selectedReport.category}</p></div><button className="icon-button" aria-label="Close report" onClick={() => setSelectedReport(null)}><X size={18} /></button></div>
            <div className="drawer-demo-note"><Info size={15} /><span>This is synthetic demonstration data, not a real laboratory report or medical interpretation.</span></div>
            <div className="drawer-section-heading"><strong>Extracted result examples</strong><span>{reportResults.length} sample values</span></div>
            <div className="result-list">
              {reportResults.map((result) => <button className={`result-row ${selectedResult.id === result.id ? "result-row-active" : ""}`} key={result.id} onClick={() => setSelectedResult(result)}><div><strong>{result.name}</strong><span>{result.shortName} · Reference: {result.reference}</span></div><div className="result-value"><strong>{result.value}</strong><span>{result.unit}</span></div><ResultStatus status={result.status} /><ChevronRight size={16} /></button>)}
            </div>
            <div className="result-explanation"><div className="explanation-title"><div className="explanation-icon"><BookOpen size={16} /></div><div><span>PLAIN-LANGUAGE CONTEXT</span><strong>{selectedResult.name}</strong></div></div><p>{selectedResult.explanation}</p><div className="source-link"><FileCheck size={15} /><div><span>DEMO SOURCE LOCATION</span><strong>{selectedResult.source}</strong></div><span className="source-unverified">Not verified</span></div></div>
            <div className="drawer-safety"><ShieldCheck size={17} /><div><strong>No diagnosis or clinical recommendation</strong><p>Values and explanatory text are synthetic. A qualified healthcare professional must interpret real results in context.</p></div></div>
            <div className="drawer-actions"><button className="button-secondary" onClick={() => { setSelectedReport(null); setView("Evidence library"); }}>Evidence approach <ArrowRight size={14} /></button><button className="button-primary" onClick={() => setSelectedReport(null)}>Done <Check size={15} /></button></div>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><div className="toast-icon"><Check size={16} /></div><div><strong>{notice.title}</strong><span>{notice.message}</span></div><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    </div>
  );
}

export default App;