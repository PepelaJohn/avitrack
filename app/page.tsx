"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, Plane, CheckCircle, AlertTriangle,
  XCircle, Info, RefreshCw, ChevronDown, ChevronUp,
  FileText, ClipboardCheck
} from "lucide-react";
import { QCResult, UtilisationEntry, FlagType } from "@/types";

/* ─── Aircraft list ──────────────────────────────────────────────────────── */
const AIRCRAFT_LIST = [
  "5Y-JXA","5Y-JXB","5Y-JXC","5Y-JXD","5Y-JXE",
  "5Y-JXH","5Y-JXI","5Y-JXL","5Y-JXM","5Y-JXO","5Y-JXP",
];

/* ─── Global styles injected once ───────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #000;
    --bg-card:   #0a0a0a;
    --bg-subtle: #060606;
    --border:    #1c1c1c;
    --border-mid:#2e2e2e;
    --text:      #fff;
    --muted:     #444;
    --dim:       #888;
    --accent:    #fff;

    --success:    #fff;
    --success-bg: #111;
    --warn:       #ccc;
    --warn-bg:    #111;
    --danger:     #fff;
    --danger-bg:  #1a1a1a;
    --info:       #aaa;
    --info-bg:    #111;

    --font-ui:   'Space Grotesk', sans-serif;
    --font-mono: 'DM Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    -webkit-font-smoothing: antialiased;
  }

  /* ── upload zone ── */
  .input-file-zone {
    border: 1px dashed var(--border-mid);
    padding: 28px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color .15s, background .15s;
  }
  .input-file-zone:hover, .input-file-zone.drag-over {
    border-color: #555;
    background: #050505;
  }
  .input-file-zone.has-file { border-style: solid; border-color: #333; }

  /* ── badges ── */
  .badge {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 2px 7px;
    font-size: 9px; font-weight: 700; letter-spacing: .14em;
    font-family: var(--font-mono);
    border: 1px solid currentColor;
  }
  .badge-ok      { color: #aaa;  border-color: #333; }
  .badge-warn    { color: #ccc;  border-color: #444; background: #0f0f0f; }
  .badge-danger  { color: #fff;  border-color: #555; background: #111; }
  .badge-info    { color: #888;  border-color: #2a2a2a; }
  .badge-neutral { color: #555;  border-color: #222; }

  /* ── primary button ── */
  .btn-primary {
    background: #fff; color: #000;
    border: none;
    padding: 11px 28px;
    font-size: 11px; font-weight: 700; letter-spacing: .14em;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background .15s;
  }
  .btn-primary:hover:not(:disabled) { background: #e0e0e0; }
  .btn-primary:disabled { background: #1a1a1a; color: #555; cursor: not-allowed; }

  /* ── card ── */
  .card {
    border: 1px solid var(--border);
    background: var(--bg-card);
  }

  /* ── fade ── */
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
  .animate-fade-in { animation: fadeIn .2s ease both; }
`;

function GlobalStyles() {
  useEffect(() => {
    const id = "ut-global";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
  return null;
}

/* ─── Theme (dark-only; toggle kept for compat) ─────────────────────────── */
function useTheme() {
  const [dark] = useState(true);
  useEffect(() => {
    document.documentElement.style.colorScheme = "dark";
  }, []);
  const toggle = () => {}; // no-op — design is always dark
  return { dark, toggle };
}

/* ─── File upload zone ───────────────────────────────────────────────────── */
function FileZone({ label, accept, file, onFile, hint }: {
  label: string; accept: string; file: File | null;
  onFile: (f: File) => void; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  };
  return (
    <div
      className={`input-file-zone${dragging ? " drag-over" : ""}${file ? " has-file" : ""}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {file ? (
          <>
            <CheckCircle size={18} color="#555" />
            <span style={{ color: "#aaa", fontWeight: 600, fontSize: 12, fontFamily: "var(--font-mono)" }}>{file.name}</span>
            <span style={{ color: "#444", fontSize: 10, fontFamily: "var(--font-mono)" }}>{(file.size / 1024).toFixed(1)} KB · click to replace</span>
          </>
        ) : (
          <>
            <Upload size={18} color="#333" />
            <span style={{ color: "#666", fontWeight: 600, fontSize: 11, letterSpacing: "0.1em" }}>{label}</span>
            {hint && <span style={{ color: "#333", fontSize: 10, fontFamily: "var(--font-mono)" }}>{hint}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Flag metadata ──────────────────────────────────────────────────────── */
const FLAG_META: Record<FlagType, { label: string; cls: string; icon: React.ReactNode }> = {
  ok:                    { label: "OK",              cls: "badge-ok",     icon: <CheckCircle size={9} /> },
  minor_diff:            { label: "MINOR DIFF",      cls: "badge-info",   icon: <Info size={9} /> },
  major_diff:            { label: "MAJOR DIFF",      cls: "badge-danger", icon: <XCircle size={9} /> },
  major_diff_oases_match:{ label: "CHECK TECHLOG",   cls: "badge-danger", icon: <AlertTriangle size={9} /> },
  wingtrac_only:         { label: "WINGTRAC ONLY",   cls: "badge-warn",   icon: <AlertTriangle size={9} /> },
  oases_only:            { label: "OASES ONLY",      cls: "badge-info",   icon: <Info size={9} /> },
  missing_techlog:       { label: "MISSING TECHLOG", cls: "badge-danger", icon: <XCircle size={9} /> },
};

function FlagBadge({ flag }: { flag: FlagType }) {
  const m = FLAG_META[flag];
  return <span className={`badge ${m.cls}`}>{m.icon} {m.label}</span>;
}

function getCellStyle(flag: FlagType): React.CSSProperties {
  if (flag === "wingtrac_only")
    return { background: "#111", color: "#ccc", fontWeight: 700, outline: "1px solid #2a2a2a" };
  if (flag === "major_diff_oases_match" || flag === "major_diff")
    return { background: "#1a1a1a", color: "#fff", fontWeight: 700, outline: "1px solid #333" };
  if (flag === "oases_only")
    return { background: "#0d0d0d", color: "#777" };
  return {};
}

/* ─── Utilisation table ──────────────────────────────────────────────────── */
function UtilisationTable({ entries, showQC }: { entries: UtilisationEntry[]; showQC: boolean }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const toggle = (d: string) => setExpandedDays(prev => {
    const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n;
  });
  const maxSectors = Math.max(...entries.map(e => e.sectors.length), 0);

  const thStyle: React.CSSProperties = {
    padding: "8px 10px", textAlign: "left",
    color: "#333", fontWeight: 600, fontSize: 9,
    letterSpacing: "0.18em", fontFamily: "var(--font-mono)",
    borderBottom: "1px solid #1c1c1c", whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = {
    padding: "7px 10px", fontSize: 12,
    fontFamily: "var(--font-mono)", color: "#aaa",
    borderBottom: "1px solid #111",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}>DATE</th>
            {Array.from({ length: maxSectors }, (_, i) => (
              <th key={i} style={{ ...thStyle, textAlign: "center" }}>S{i + 1}</th>
            ))}
            <th style={{ ...thStyle, textAlign: "right" }}>TOT MIN</th>
            <th style={{ ...thStyle, textAlign: "right" }}>HRS</th>
            <th style={{ ...thStyle, textAlign: "right" }}>CYC</th>
            {showQC && <th style={thStyle}>FLAGS</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hasFlags = entry.sectors.some(s => s.flag !== "ok");
            const isExpanded = expandedDays.has(entry.date);
            return (
              <React.Fragment key={entry.date}>
                <tr
                  style={{ cursor: showQC && hasFlags ? "pointer" : undefined }}
                  onClick={() => showQC && hasFlags && toggle(entry.date)}
                >
                  <td style={{ ...tdBase, whiteSpace: "nowrap", color: "#666" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {showQC && hasFlags && (isExpanded
                        ? <ChevronUp size={11} color="#555" />
                        : <ChevronDown size={11} color="#555" />)}
                      {entry.date.split("-").reverse().join("/")}
                    </span>
                  </td>
                  {Array.from({ length: maxSectors }, (_, i) => {
                    const sector = entry.sectors[i];
                    if (!sector) return (
                      <td key={i} style={{ ...tdBase, textAlign: "center", color: "#222" }}>—</td>
                    );
                    return (
                      <td key={i} style={{ ...tdBase, textAlign: "center", ...getCellStyle(sector.flag as FlagType) }}>
                        {sector.minutes}
                      </td>
                    );
                  })}
                  <td style={{ ...tdBase, textAlign: "right", color: "#fff", fontWeight: 600 }}>{entry.totalMin}</td>
                  <td style={{ ...tdBase, textAlign: "right" }}>{entry.totalHrs.toFixed(2)}</td>
                  <td style={{ ...tdBase, textAlign: "right" }}>{entry.totalCycles}</td>
                  {showQC && (
                    <td style={tdBase}>
                      {hasFlags && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {[...new Set(entry.sectors.filter(s => s.flag !== "ok").map(s => s.flag))].map(f => (
                            <FlagBadge key={f} flag={f as FlagType} />
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
                {showQC && isExpanded && (
                  <tr key={`${entry.date}-detail`}>
                    <td colSpan={maxSectors + (showQC ? 5 : 4)} style={{ padding: "8px 16px 12px", background: "#060606", borderBottom: "1px solid #111" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {entry.sectors.filter(s => s.flag !== "ok").map(s => (
                          <div key={s.sectorIndex} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", border: "1px solid #1a1a1a" }}>
                            <span style={{ color: "#333", fontSize: 10, minWidth: 60, fontFamily: "var(--font-mono)" }}>Sector {s.sectorIndex}</span>
                            <FlagBadge flag={s.flag as FlagType} />
                            <span style={{ color: "#555", fontSize: 11, flex: 1 }}>{s.comment}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── QC summary ─────────────────────────────────────────────────────────── */
function QCSummary({ result }: { result: QCResult }) {
  const s = result.summary;
  const items = [
    { label: "TOTAL SECTORS", val: s.total },
    { label: "OK",            val: s.ok },
    { label: "CHECK TECHLOG", val: s.majorDiff },
    { label: "WINGTRAC ONLY", val: s.wingtracOnly },
    { label: "OASES ONLY",    val: s.oasesOnly },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", border: "1px solid #1c1c1c", marginBottom: 20 }}>
      {items.map((item, i) => (
        <div key={item.label} style={{
          padding: "14px 16px",
          borderRight: i < items.length - 1 ? "1px solid #1c1c1c" : "none",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)", lineHeight: 1 }}>{item.val}</div>
          <div style={{ fontSize: 9, letterSpacing: "0.16em", color: "#444", marginTop: 5, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Shared field styles ────────────────────────────────────────────────── */
const fieldLabel: React.CSSProperties = {
  display: "block", marginBottom: 6,
  fontSize: 9, fontWeight: 600, letterSpacing: "0.18em",
  color: "#444", fontFamily: "var(--font-mono)",
};
const fieldControl: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: "#060606", border: "1px solid #1c1c1c",
  color: "#fff", fontFamily: "var(--font-mono)", fontSize: 12,
  outline: "none", appearance: "none", WebkitAppearance: "none",
  colorScheme: "dark" as React.CSSProperties["colorScheme"],
};

/* ─── Aircraft + month selectors ─────────────────────────────────────────── */
function AircraftMonthSelectors({ aircraft, month, onAircraft, onMonth }: {
  aircraft: string; month: string;
  onAircraft: (v: string) => void; onMonth: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
      <div>
        <label style={fieldLabel}>AIRCRAFT REG</label>
        <select value={aircraft} onChange={e => onAircraft(e.target.value)} style={fieldControl}>
          <option value="">Select registration…</option>
          {AIRCRAFT_LIST.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label style={fieldLabel}>PERIOD</label>
        <input type="month" value={month} onChange={e => onMonth(e.target.value)} style={fieldControl} />
      </div>
    </div>
  );
}

/* ─── Section label ──────────────────────────────────────────────────────── */
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#444", fontWeight: 600, letterSpacing: "0.18em", whiteSpace: "nowrap" }}>
        {n} / {children}
      </span>
      <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Home() {
  const { dark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<"fill" | "qc">("fill");

  // Fill tab
  const [fillOasesFile, setFillOasesFile] = useState<File | null>(null);
  const [fillAircraft,  setFillAircraft]  = useState("");
  const [fillMonth,     setFillMonth]     = useState("");
  const [fillLoading,   setFillLoading]   = useState(false);
  const [fillResult,    setFillResult]    = useState<{ entries: UtilisationEntry[]; totalFlights: number } | null>(null);
  const [fillError,     setFillError]     = useState("");

  // QC tab
  const [qcOasesFile,  setQcOasesFile]  = useState<File | null>(null);
  const [wingtracFile, setWingtracFile] = useState<File | null>(null);
  const [qcAircraft,  setQcAircraft]   = useState("");
  const [qcMonth,     setQcMonth]      = useState("");
  const [qcLoading,   setQcLoading]    = useState(false);
  const [qcResult,    setQcResult]     = useState<QCResult | null>(null);
  const [qcError,     setQcError]      = useState("");

  const runFill = async () => {
    if (!fillOasesFile || !fillAircraft || !fillMonth) return;
    setFillLoading(true); setFillError(""); setFillResult(null);
    try {
      const fd = new FormData();
      fd.append("oasesFile", fillOasesFile);
      fd.append("aircraft", fillAircraft);
      fd.append("month", fillMonth);
      const res  = await fetch("/api/fill-utilisation", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFillResult(data);
    } catch (e) { setFillError(String(e)); }
    finally { setFillLoading(false); }
  };

  const runQCCheck = async () => {
    if (!qcOasesFile || !wingtracFile || !qcAircraft || !qcMonth) return;
    setQcLoading(true); setQcError(""); setQcResult(null);
    try {
      const fd = new FormData();
      fd.append("oasesFile", qcOasesFile);
      fd.append("wingtracFile", wingtracFile);
      fd.append("aircraft", qcAircraft);
      fd.append("month", qcMonth);
      const res  = await fetch("/api/run-qc", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQcResult(data.qcResult);
    } catch (e) { setQcError(String(e)); }
    finally { setQcLoading(false); }
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column" }}>

        {/* ── NAV ── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", height: 56,
          borderBottom: "1px solid #1a1a1a",
          position: "sticky", top: 0, zIndex: 100,
          background: "#000",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 26, height: 26,
              border: "1.5px solid #fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plane size={12} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.12em" }}>
              UTIL<span style={{ color: "#555" }}>TRACK</span>
            </span>
          </div>

          {/* Nav links — Montek style */}
          <nav style={{ display: "flex", gap: 0 }}>
            {([
              { id: "fill" as const, label: "FILL",    icon: <FileText size={11} /> },
              { id: "qc"   as const, label: "QUALITY", icon: <ClipboardCheck size={11} /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "0 20px", height: 56,
                  background: "none", border: "none",
                  borderBottom: activeTab === tab.id ? "1.5px solid #fff" : "1.5px solid transparent",
                  color: activeTab === tab.id ? "#fff" : "#444",
                  fontWeight: 600, fontSize: 10, letterSpacing: "0.18em",
                  fontFamily: "var(--font-ui)",
                  cursor: "pointer",
                  transition: "color .15s, border-color .15s",
                }}
              >
                <span style={{ color: "#2a2a2a" }}>—</span>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Theme toggle (kept for compat, minimal styling) */}
          <button
            onClick={toggle}
            style={{
              background: "none", border: "1px solid #1c1c1c",
              padding: "5px 12px", cursor: "pointer",
              color: "#444", fontSize: 10, letterSpacing: "0.12em",
              fontFamily: "var(--font-ui)", fontWeight: 600,
            }}
          >
            {dark ? "LIGHT" : "DARK"}
          </button>
        </header>

        {/* ── HERO ── */}
        <div style={{ padding: "36px 32px 28px", borderBottom: "1px solid #111" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.22em", color: "#333", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
            AIRCRAFT UTILISATION MANAGER · v2.0
          </div>
          <div style={{ fontSize: "clamp(56px,9vw,88px)", fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.03em", userSelect: "none" }}>
            <div style={{ color: "#fff" }}>UTIL</div>
            <div style={{ color: "transparent", WebkitTextStroke: "1px #2a2a2a" }}>TRACK</div>
          </div>
          <p style={{ marginTop: 14, fontSize: 11, color: "#444", letterSpacing: "0.04em", maxWidth: 360, lineHeight: 1.8 }}>
            Automated sector reconciliation between Oases and Wingtrac.
            Discrepancies &gt;5 min flagged for techlog review.
          </p>
        </div>

        {/* ── BODY ── */}
        <main style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "28px 32px" }}>

          {/* ═══ FILL TAB ═══ */}
          {activeTab === "fill" && (
            <div className="animate-fade-in">
              <div className="card" style={{ padding: 24 }}>
                <SectionLabel n="01">OASES IMPORT</SectionLabel>

                <div style={{ marginBottom: 16 }}>
                  <FileZone
                    label="OASES EXPORT"
                    accept=".xls,.xlsx"
                    file={fillOasesFile}
                    onFile={setFillOasesFile}
                    hint=".xls / .xlsx · single aircraft"
                  />
                </div>

                <AircraftMonthSelectors
                  aircraft={fillAircraft} month={fillMonth}
                  onAircraft={setFillAircraft} onMonth={setFillMonth}
                />

                <button
                  className="btn-primary"
                  onClick={runFill}
                  disabled={!fillOasesFile || !fillAircraft || !fillMonth || fillLoading}
                >
                  {fillLoading
                    ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={12} /> PROCESSING…</span>
                    : "GENERATE UTILISATION TABLE"}
                </button>

                {fillError && (
                  <div style={{ marginTop: 12, padding: "10px 14px", border: "1px solid #333", color: "#888", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {fillError}
                  </div>
                )}
              </div>

              {fillResult && (
                <div className="card animate-fade-in" style={{ padding: 24, marginTop: 12 }}>
                  <SectionLabel n="02">RESULT</SectionLabel>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em" }}>{fillAircraft}</span>
                    <span style={{ color: "#444", fontSize: 11, fontFamily: "var(--font-mono)" }}>{fillMonth}</span>
                    <span className="badge badge-neutral">{fillResult.totalFlights} SECTORS</span>
                  </div>
                  <UtilisationTable entries={fillResult.entries} showQC={false} />
                </div>
              )}
            </div>
          )}

          {/* ═══ QC TAB ═══ */}
          {activeTab === "qc" && (
            <div className="animate-fade-in">
              <div className="card" style={{ padding: 24 }}>
                <SectionLabel n="01">QC RECONCILIATION</SectionLabel>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <FileZone label="OASES EXPORT"  accept=".xls,.xlsx" file={qcOasesFile}  onFile={setQcOasesFile}  hint=".xls / .xlsx" />
                  <FileZone label="WINGTRAC DATA" accept=".csv"        file={wingtracFile} onFile={setWingtracFile} hint="wingtrac_data.csv" />
                </div>

                <AircraftMonthSelectors
                  aircraft={qcAircraft} month={qcMonth}
                  onAircraft={setQcAircraft} onMonth={setQcMonth}
                />

                <button
                  className="btn-primary"
                  onClick={runQCCheck}
                  disabled={!qcOasesFile || !wingtracFile || !qcAircraft || !qcMonth || qcLoading}
                >
                  {qcLoading
                    ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={12} /> RUNNING QC…</span>
                    : "RUN QUALITY CHECK"}
                </button>

                {qcError && (
                  <div style={{ marginTop: 12, padding: "10px 14px", border: "1px solid #333", color: "#888", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {qcError}
                  </div>
                )}
              </div>

              {/* QC logic legend */}
              <div style={{ marginTop: 12, padding: "16px 18px", border: "1px solid #111", background: "#060606" }}>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#333", fontFamily: "var(--font-mono)", fontWeight: 600, marginBottom: 12 }}>
                  QC LOGIC / THRESHOLD ±5 MIN
                </div>
                {[
                  { dot: "#fff",  text: "Diff ≤5 min — OK, use Oases value" },
                  { dot: "#888",  text: "Diff >5 min — flagged for techlog verification" },
                  { dot: "#555",  text: "Wingtrac only — fill value, highlight for review" },
                  { dot: "#333",  text: "Oases only — flag, no Wingtrac match" },
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 11, color: "#555" }}>
                    <div style={{ width: 6, height: 6, background: row.dot, flexShrink: 0 }} />
                    {row.text}
                  </div>
                ))}
              </div>

              {qcResult && (
                <div className="card animate-fade-in" style={{ padding: 24, marginTop: 12 }}>
                  <SectionLabel n="02">RESULT</SectionLabel>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.06em" }}>{qcResult.aircraft}</span>
                    <span style={{ color: "#444", fontSize: 11, fontFamily: "var(--font-mono)" }}>{qcResult.month}</span>
                  </div>

                  <QCSummary result={qcResult} />

                  {/* Legend */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, padding: "8px 12px", border: "1px solid #111", fontSize: 10 }}>
                    <span style={{ color: "#333", fontWeight: 600, fontSize: 9, letterSpacing: "0.14em", marginRight: 4, fontFamily: "var(--font-mono)" }}>LEGEND</span>
                    <span className="badge badge-ok"><CheckCircle size={8} /> OK</span>
                    <span className="badge badge-warn"><AlertTriangle size={8} /> WINGTRAC ONLY</span>
                    <span className="badge badge-danger"><XCircle size={8} /> CHECK TECHLOG</span>
                    <span className="badge badge-info"><Info size={8} /> OASES ONLY</span>
                  </div>

                  <UtilisationTable entries={qcResult.entries} showQC={true} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: "1px solid #111",
          padding: "14px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.18em", color: "#2a2a2a", fontFamily: "var(--font-mono)" }}>
            AviTrack · UTILISATION AUTOMATION
          </span>
          <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "#2a2a2a", fontFamily: "var(--font-mono)" }}>
            THRESHOLD ±5 MIN
          </span>
        </footer>
      </div>
    </>
  );
}