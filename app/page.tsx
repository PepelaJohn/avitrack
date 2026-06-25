"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, Moon, Sun, Plane, CheckCircle, AlertTriangle,
  XCircle, Info, RefreshCw, ChevronDown, ChevronUp,
  FileText, ClipboardCheck
} from "lucide-react";
import { QCResult, UtilisationEntry, FlagType } from "@/types";

// ── Hardcoded aircraft list ──────────────────────────────────────────────────
const AIRCRAFT_LIST = [
  "5Y-JXA", "5Y-JXB", "5Y-JXC", "5Y-JXD", "5Y-JXE",
  "5Y-JXH", "5Y-JXI", "5Y-JXL", "5Y-JXM", "5Y-JXO", "5Y-JXP",
];

// ── Theme ────────────────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

// ── File upload zone ─────────────────────────────────────────────────────────
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
      onDragLeave={() => setDragging(false)} onDrop={handleDrop}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="flex flex-col items-center gap-2">
        {file ? (
          <>
            <CheckCircle size={20} style={{ color: "var(--success)" }} />
            <span style={{ color: "var(--success)", fontWeight: 600, fontSize: 13 }}>{file.name}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{(file.size / 1024).toFixed(1)} KB · Click to replace</span>
          </>
        ) : (
          <>
            <Upload size={20} style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: 13 }}>{label}</span>
            {hint && <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{hint}</span>}
          </>
        )}
      </div>
    </div>
  );
}

// ── Flag metadata ────────────────────────────────────────────────────────────
const FLAG_META: Record<FlagType, { label: string; cls: string; icon: React.ReactNode }> = {
  ok:                    { label: "OK",               cls: "badge-ok",      icon: <CheckCircle size={10} /> },
  minor_diff:            { label: "MINOR DIFF",       cls: "badge-info",    icon: <Info size={10} /> },
  major_diff:            { label: "MAJOR DIFF",       cls: "badge-danger",  icon: <XCircle size={10} /> },
  major_diff_oases_match:{ label: "CHECK TECHLOG",    cls: "badge-danger",  icon: <AlertTriangle size={10} /> },
  wingtrac_only:         { label: "WINGTRAC ONLY",    cls: "badge-warn",    icon: <AlertTriangle size={10} /> },
  oases_only:            { label: "OASES ONLY",       cls: "badge-info",    icon: <Info size={10} /> },
  missing_techlog:       { label: "MISSING TECHLOG",  cls: "badge-danger",  icon: <XCircle size={10} /> },
};

function FlagBadge({ flag }: { flag: FlagType }) {
  const m = FLAG_META[flag];
  return <span className={`badge ${m.cls}`}>{m.icon} {m.label}</span>;
}

function getCellStyle(flag: FlagType): React.CSSProperties {
  if (flag === "wingtrac_only") return { background: "var(--warn-bg)", color: "var(--warn)", fontWeight: 700 };
  if (flag === "major_diff_oases_match" || flag === "major_diff") return { background: "var(--danger-bg)", color: "var(--danger)", fontWeight: 700 };
  if (flag === "oases_only") return { background: "var(--info-bg)", color: "var(--info)" };
  return {};
}

// ── Utilisation table ────────────────────────────────────────────────────────
function UtilisationTable({ entries, showQC }: { entries: UtilisationEntry[]; showQC: boolean }) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const toggle = (d: string) => setExpandedDays(prev => {
    const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n;
  });
  const maxSectors = Math.max(...entries.map(e => e.sectors.length), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "DM Mono, monospace" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>DATE</th>
            {Array.from({ length: maxSectors }, (_, i) => (
              <th key={i} style={{ padding: "8px 6px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600 }}>S{i + 1}</th>
            ))}
            <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>TOT MIN</th>
            <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>HRS</th>
            <th style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>CYC</th>
            {showQC && <th style={{ padding: "8px 10px", color: "var(--text-muted)", fontWeight: 600 }}>FLAGS</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const hasFlags = entry.sectors.some(s => s.flag !== "ok");
            const isExpanded = expandedDays.has(entry.date);
            return (
              <React.Fragment key={entry.date}>
                <tr
                  style={{ borderBottom: "1px solid var(--border)", background: hasFlags ? "rgba(200,98,42,0.03)" : undefined, cursor: showQC && hasFlags ? "pointer" : undefined }}
                  onClick={() => showQC && hasFlags && toggle(entry.date)}
                >
                  <td style={{ padding: "7px 10px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {showQC && hasFlags && (isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      {entry.date.split("-").reverse().join("/")}
                    </span>
                  </td>
                  {Array.from({ length: maxSectors }, (_, i) => {
                    const sector = entry.sectors[i];
                    if (!sector) return <td key={i} style={{ padding: "7px 6px", textAlign: "center", color: "var(--text-muted)" }}>—</td>;
                    return (
                      <td key={i} style={{ padding: "7px 6px", textAlign: "center", borderRadius: 4, ...getCellStyle(sector.flag as FlagType) }}>
                        {sector.minutes}
                      </td>
                    );
                  })}
                  <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>{entry.totalMin}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--text-secondary)" }}>{entry.totalHrs.toFixed(2)}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", color: "var(--text-secondary)" }}>{entry.totalCycles}</td>
                  {showQC && (
                    <td style={{ padding: "7px 10px" }}>
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
                  <tr key={`${entry.date}-detail`} style={{ background: "var(--bg-subtle)" }}>
                    <td colSpan={maxSectors + (showQC ? 5 : 4)} style={{ padding: "8px 16px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {entry.sectors.filter(s => s.flag !== "ok").map(s => (
                          <div key={s.sectorIndex} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", background: "var(--bg-card)", borderRadius: 6, border: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 11, minWidth: 60 }}>Sector {s.sectorIndex}</span>
                            <FlagBadge flag={s.flag as FlagType} />
                            <span style={{ color: "var(--text-secondary)", fontSize: 11, flex: 1 }}>{s.comment}</span>
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

// ── QC summary cards ─────────────────────────────────────────────────────────
function QCSummary({ result }: { result: QCResult }) {
  const s = result.summary;
  const items = [
    { label: "Total Sectors", val: s.total,        cls: "badge-neutral" },
    { label: "OK",            val: s.ok,            cls: "badge-ok" },
    { label: "Check Techlog", val: s.majorDiff,     cls: "badge-danger" },
    { label: "Wingtrac Only", val: s.wingtracOnly,  cls: "badge-warn" },
    { label: "Oases Only",    val: s.oasesOnly,     cls: "badge-info" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 16px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, minWidth: 110 }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "DM Mono" }}>{item.val}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 2 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Shared select/input styles ────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", background: "var(--bg-subtle)",
  border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)",
  fontFamily: "Syne, sans-serif", fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", background: "var(--bg-subtle)",
  border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)",
  fontFamily: "DM Mono, monospace", fontSize: 13,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 4,
};

// ── Aircraft + month selectors (shared) ───────────────────────────────────────
function AircraftMonthSelectors({ aircraft, month, onAircraft, onMonth }: {
  aircraft: string; month: string;
  onAircraft: (v: string) => void; onMonth: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
      <div>
        <label style={labelStyle}>AIRCRAFT</label>
        <select value={aircraft} onChange={e => onAircraft(e.target.value)} style={selectStyle}>
          <option value="">Select aircraft…</option>
          {AIRCRAFT_LIST.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>MONTH</label>
        <input type="month" value={month} onChange={e => onMonth(e.target.value)} style={inputStyle} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { dark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<"fill" | "qc">("fill");

  // ── Fill tab state ──
  const [fillOasesFile, setFillOasesFile]     = useState<File | null>(null);
  const [fillAircraft,  setFillAircraft]       = useState("");
  const [fillMonth,     setFillMonth]           = useState("");
  const [fillLoading,   setFillLoading]         = useState(false);
  const [fillResult,    setFillResult]           = useState<{ entries: UtilisationEntry[]; totalFlights: number } | null>(null);
  const [fillError,     setFillError]           = useState("");

  // ── QC tab state ──
  const [qcOasesFile,   setQcOasesFile]         = useState<File | null>(null);
  const [wingtracFile,  setWingtracFile]         = useState<File | null>(null);
  const [qcAircraft,   setQcAircraft]           = useState("");
  const [qcMonth,      setQcMonth]              = useState("");
  const [qcLoading,    setQcLoading]            = useState(false);
  const [qcResult,     setQcResult]             = useState<QCResult | null>(null);
  const [qcError,      setQcError]              = useState("");

  // ── Fill handler ──
  const runFill = async () => {
    if (!fillOasesFile || !fillAircraft || !fillMonth) return;
    setFillLoading(true); setFillError(""); setFillResult(null);
    try {
      const fd = new FormData();
      fd.append("oasesFile", fillOasesFile);
      fd.append("aircraft", fillAircraft);
      fd.append("month", fillMonth);
      const res = await fetch("/api/fill-utilisation", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFillResult(data);
    } catch (e) { setFillError(String(e)); }
    finally { setFillLoading(false); }
  };

  // ── QC handler ──
  const runQCCheck = async () => {
    if (!qcOasesFile || !wingtracFile || !qcAircraft || !qcMonth) return;
    setQcLoading(true); setQcError(""); setQcResult(null);
    try {
      const fd = new FormData();
      fd.append("oasesFile", qcOasesFile);
      fd.append("wingtracFile", wingtracFile);
      fd.append("aircraft", qcAircraft);
      fd.append("month", qcMonth);
      const res = await fetch("/api/run-qc", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQcResult(data.qcResult);
    } catch (e) { setQcError(String(e)); }
    finally { setQcLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-card)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plane size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "0.04em" }}>
            UTIL<span style={{ color: "var(--accent)" }}>TRACK</span>
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 6 }}>Aircraft Utilisation Manager</span>
        </div>
        <button onClick={toggle} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>
          {dark ? <Sun size={13} /> : <Moon size={13} />} {dark ? "Light" : "Dark"}
        </button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid var(--border)" }}>
          {([
            { id: "fill" as const, label: "Fill Utilisation",  icon: <FileText size={14} /> },
            { id: "qc"   as const, label: "Quality Check",     icon: <ClipboardCheck size={14} /> },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "none", border: "none", borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -2, color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)", fontWeight: activeTab === tab.id ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "Syne, sans-serif", transition: "color 0.15s" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── FILL TAB ── */}
        {activeTab === "fill" && (
          <div className="animate-fade-in">
            <div className="card" style={{ padding: "24px" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Fill Utilisation from Oases</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                  Upload the Oases export for a single aircraft. Flights are sorted by departure time and filled into Sector 1, 2, 3… in order.
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <FileZone label="Oases Export (.xls / .xlsx)" accept=".xls,.xlsx" file={fillOasesFile} onFile={setFillOasesFile} hint="Single aircraft Oases export" />
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
                  ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={13} /> Processing…</span>
                  : "Generate Utilisation Table"}
              </button>

              {fillError && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--danger-bg)", borderRadius: 6, color: "var(--danger)", fontSize: 12 }}>{fillError}</div>
              )}
            </div>

            {fillResult && (
              <div className="card animate-fade-in" style={{ padding: "24px", marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{fillAircraft}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{fillMonth}</span>
                  <span className="badge badge-ok">{fillResult.totalFlights} sectors</span>
                </div>
                <UtilisationTable entries={fillResult.entries} showQC={false} />
              </div>
            )}
          </div>
        )}

        {/* ── QC TAB ── */}
        {activeTab === "qc" && (
          <div className="animate-fade-in">
            <div className="card" style={{ padding: "24px" }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Quality Check — Wingtrac vs Oases</div>
                <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>
                  Flights matched sequentially by departure order per day. Discrepancies &gt;5 min flagged for techlog verification.
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <FileZone label="Oases Export (.xls / .xlsx)" accept=".xls,.xlsx" file={qcOasesFile} onFile={setQcOasesFile} hint="Single aircraft Oases export" />
                <FileZone label="Wingtrac Data (.csv)" accept=".csv" file={wingtracFile} onFile={setWingtracFile} hint="wingtrac_data.csv" />
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
                  ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={13} /> Running QC…</span>
                  : "Run Quality Check"}
              </button>

              {qcError && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--danger-bg)", borderRadius: 6, color: "var(--danger)", fontSize: 12 }}>{qcError}</div>
              )}
            </div>

            <div style={{ marginTop: 12, padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
              <strong style={{ color: "var(--text-primary)" }}>QC Logic:</strong> Flights matched sequentially per day by departure order.{" "}
              <strong>≤5 min diff</strong> → ✅ OK, use Oases value.{" "}
              <strong>&gt;5 min diff</strong> → 🔴 flagged, highlight red.{" "}
              <strong>Wingtrac only</strong> → 🟡 fill with Wingtrac, highlight yellow.{" "}
              <strong>Oases only</strong> → 🔵 flag for review.
            </div>

            {qcResult && (
              <div className="card animate-fade-in" style={{ padding: "24px", marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{qcResult.aircraft}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{qcResult.month}</span>
                </div>
                <QCSummary result={qcResult} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: 8, fontSize: 11 }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600, marginRight: 4 }}>LEGEND:</span>
                  <span className="badge badge-ok"><CheckCircle size={9} /> OK</span>
                  <span className="badge badge-warn"><AlertTriangle size={9} /> Wingtrac only</span>
                  <span className="badge badge-danger"><XCircle size={9} /> Check techlog</span>
                  <span className="badge badge-info"><Info size={9} /> Oases only</span>
                </div>
                <UtilisationTable entries={qcResult.entries} showQC={true} />
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 11, marginTop: 40 }}>
        UtilTrack · Aircraft Utilisation Automation · Threshold: ±5 min discrepancy
      </footer>
    </div>
  );
}
