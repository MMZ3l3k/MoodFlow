'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import axiosClient from '../../../../lib/axiosClient';
import { getAccessToken } from '../../../../lib/auth';
import { buildReportPdf } from '../../../../lib/buildReportPdf';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface AssessmentOption { code: string; name: string; }
interface TrendPoint { week: string; avgScore: number; count: number; assessmentCode: string; }
interface DepartmentStat {
  department: string; activeUsers: number; participantCount: number;
  submissions: number; avgScore: number | null; participationRate: number;
}
interface SeverityItem { severity: string; assessmentCode?: string; count: number; }
interface DeptLoad {
  department: string; deptSize: number; participants: number;
  wellbeingIndex: number | null;
  load: 'stable' | 'moderate' | 'high' | 'no_data';
  trend: 'improving' | 'worsening' | 'stable' | 'no_data';
  color: string;
}
interface RiskItem {
  key: string; label: string; icon: string; assessmentCode: string;
  currentCount: number; previousCount: number;
  currentPct: number; previousPct: number; delta: number;
}
interface RiskReport { totalActive: number; risks: RiskItem[]; }
interface CriticalChange {
  department: string; recentIndex: number; prevIndex: number; drop: number;
  direction: 'worsening' | 'improving'; severity: 'critical' | 'warning';
}
interface Summary {
  totalActiveUsers: number; totalResultsSubmitted: number;
  avgNormalizedScore: number; participationRate: number;
}

interface ReportData {
  generatedAt: string;
  filters: { dateFrom: string; dateTo: string; department: string; assessmentCode: string };
  summary: Summary;
  trends: TrendPoint[];
  deptStats: DepartmentStat[];
  deptLoad: DeptLoad[];
  severity: SeverityItem[];
  riskReport: RiskReport;
  criticalChanges: CriticalChange[];
}

/* ─── Style constants ───────────────────────────────────────────────────── */

const SEVERITY_COLORS: Record<string, string> = {
  minimal: '#22c55e', mild: '#84cc16', moderate: '#f59e0b', moderately_severe: '#f97316',
  severe: '#ef4444', high: '#ef4444', low: '#22c55e', average: '#3b82f6',
  'low-distress': '#22c55e', 'moderate-distress': '#f59e0b', 'high-distress': '#ef4444',
  low_wellbeing: '#ef4444', adequate_wellbeing: '#22c55e',
  good: '#22c55e', very_low: '#ef4444',
};
const SEVERITY_LABELS: Record<string, string> = {
  minimal: 'Minimalne', mild: 'Łagodne', moderate: 'Umiarkowane',
  moderately_severe: 'Umiark. ciężkie', severe: 'Ciężkie',
  high: 'Wysokie', low: 'Niskie', average: 'Przeciętne',
  'low-distress': 'Niski stres', 'moderate-distress': 'Umiark. stres', 'high-distress': 'Wysoki stres',
  low_wellbeing: 'Niski dobrostan', adequate_wellbeing: 'Wystarczający dobrostan',
  good: 'Dobry nastrój', very_low: 'Bardzo niski nastrój',
};
const ZONE_COLORS: Record<string, string> = {
  stable: '#22c55e', moderate: '#f59e0b', high: '#ef4444', no_data: '#94a3b8',
};
const ZONE_LABELS: Record<string, string> = {
  stable: 'Dobry', moderate: 'Umiarkowany', high: 'Wysoki risk', no_data: 'Brak danych',
};
const RISK_COLORS: Record<string, string> = {
  stress: '#f97316', depression: '#8b5cf6', anxiety: '#3b82f6', burnout: '#ef4444',
};
const RISK_ICONS: Record<string, string> = {
  stress: '😰', depression: '😔', anxiety: '😟', burnout: '🔥',
};
const RISK_DETAILS: Record<string, { test: string; threshold: string; what: string }> = {
  stress: {
    test: 'PSS-10',
    threshold: '≥ 27 / 40 pkt',
    what: 'Wysoki poziom odczuwanego stresu i braku kontroli nad sytuacjami.',
  },
  depression: {
    test: 'PHQ-9',
    threshold: '≥ 10 / 27 pkt (poziom umiarkowany+)',
    what: 'Możliwe objawy obniżonego nastroju, braku energii i problemów z koncentracją.',
  },
  anxiety: {
    test: 'GAD-7',
    threshold: '≥ 10 / 21 pkt (poziom umiarkowany+)',
    what: 'Trudności z lękiem, napięciem i problemami z relaksacją.',
  },
  burnout: {
    test: 'MOOD-10',
    threshold: '≤ 30 / 50 pkt (niski nastrój)',
    what: 'Niski poziom nastroju i energii — możliwy sygnał wczesnego wypalenia.',
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const S = {
  page: { width: 860, fontFamily: 'system-ui, sans-serif', background: '#f8fafc', padding: 32 },
  card: { background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 11, color: '#9ca3af', marginBottom: 16 },
  sectionDivider: { borderTop: '2px solid #e5e7eb', marginTop: 8, marginBottom: 24, paddingTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 },
  th: { padding: '8px 14px', textAlign: 'left' as const, fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f9fafb' },
  thR: { padding: '8px 14px', textAlign: 'right' as const, fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f9fafb' },
  td: { padding: '9px 14px', color: '#374151', fontSize: 13, borderTop: '1px solid #f3f4f6' },
  tdR: { padding: '9px 14px', color: '#374151', fontSize: 13, textAlign: 'right' as const, borderTop: '1px solid #f3f4f6' },
};

function KpiBox({ label, value, sub, borderColor }: { label: string; value: string; sub: string; borderColor: string }) {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '16px 18px', borderLeft: `4px solid ${borderColor}` }}>
      <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function ScaleBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 8 }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: 8, borderRadius: 6, background: color }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 32, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function ZoneBadge({ load }: { load: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#fff', background: ZONE_COLORS[load] ?? '#94a3b8' }}>
      {ZONE_LABELS[load] ?? load}
    </span>
  );
}

function TrendLabel({ trend }: { trend: string }) {
  if (trend === 'improving') return <span style={{ color: '#059669', fontSize: 12, fontWeight: 600 }}>↑ Poprawa</span>;
  if (trend === 'worsening') return <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>↓ Pogorszenie</span>;
  if (trend === 'stable') return <span style={{ color: '#6b7280', fontSize: 12 }}>→ Stabilny</span>;
  return <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>;
}

/* ─── Report Document ───────────────────────────────────────────────────── */

function ReportDocument({ data }: { data: ReportData }) {
  /* Computed helpers */
  const trendsByWeek = Object.values(
    data.trends.reduce<Record<string, { week: string; avgScore: number; count: number }>>((acc, item) => {
      if (!acc[item.week]) acc[item.week] = { week: item.week, avgScore: item.avgScore, count: item.count };
      else {
        const total = acc[item.week].avgScore * acc[item.week].count + item.avgScore * item.count;
        const n = acc[item.week].count + item.count;
        acc[item.week] = { week: item.week, avgScore: Math.round((total / n) * 10) / 10, count: n };
      }
      return acc;
    }, {})
  ).sort((a, b) => a.week.localeCompare(b.week));

  const trendFirst = trendsByWeek[0]?.avgScore ?? null;
  const trendLast = trendsByWeek[trendsByWeek.length - 1]?.avgScore ?? null;
  const trendDiff = trendFirst !== null && trendLast !== null ? Math.round((trendLast - trendFirst) * 10) / 10 : null;

  const pieData = Object.entries(
    data.severity.reduce<Record<string, number>>((acc, s) => { acc[s.severity] = (acc[s.severity] ?? 0) + s.count; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const deptRanking = [...data.deptLoad]
    .filter((d) => d.wellbeingIndex !== null)
    .sort((a, b) => (b.wellbeingIndex ?? 0) - (a.wellbeingIndex ?? 0));

  const zoneDistrib = Object.entries(
    data.deptLoad.reduce<Record<string, number>>((acc, d) => { acc[d.load] = (acc[d.load] ?? 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const bestDept = deptRanking[0] ?? null;
  const worstDept = deptRanking[deptRanking.length - 1] ?? null;

  const worseningChanges = data.criticalChanges.filter((c) => c.direction === 'worsening');
  const improvingChanges = data.criticalChanges.filter((c) => c.direction === 'improving');

  const wbIndex = data.summary.avgNormalizedScore;
  const wbLabel = wbIndex >= 80 ? 'Bardzo dobry' : wbIndex >= 60 ? 'Dobry' : wbIndex >= 40 ? 'Umiarkowany' : 'Wymaga uwagi';
  const wbColor = wbIndex >= 80 ? '#22c55e' : wbIndex >= 60 ? '#eab308' : wbIndex >= 40 ? '#f97316' : '#ef4444';

  return (
    <div style={S.page}>

      {/* ══ COVER ══════════════════════════════════════════════════════════ */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', marginBottom: 24, borderLeft: '6px solid #10b981' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>Raport dobrostanu pracowników</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>MoodFlow — dane zagregowane i anonimowe</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
            <div>Wygenerowano</div>
            <div style={{ fontWeight: 700, color: '#374151', fontSize: 13 }}>{new Date(data.generatedAt).toLocaleString('pl-PL')}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: '#f3f4f6', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#374151' }}>
            📅 Okres: {data.filters.dateFrom} — {data.filters.dateTo}
          </span>
          <span style={{ background: data.filters.department ? '#ede9fe' : '#f3f4f6', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: data.filters.department ? '#5b21b6' : '#374151' }}>
            🏢 Dział: {data.filters.department || 'Cała firma'}
          </span>
          <span style={{ background: data.filters.assessmentCode ? '#d1fae5' : '#f3f4f6', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: data.filters.assessmentCode ? '#065f46' : '#374151' }}>
            📋 Test: {data.filters.assessmentCode || 'Wszystkie testy'}
          </span>
        </div>
      </div>

      {/* ══ SEKCJA 1: PODSUMOWANIE WYKONAWCZE ══════════════════════════════ */}
      <div style={{ ...S.sectionDivider }}>
        <div style={S.sectionLabel}>1. Podsumowanie wykonawcze</div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
        <KpiBox label="Indeks dobrostanu" value={`${data.summary.avgNormalizedScore} / 100`} sub={`Status: ${wbLabel}`} borderColor={wbColor} />
        <KpiBox label="Aktywni pracownicy" value={String(data.summary.totalActiveUsers)} sub="Konta z statusem ACTIVE" borderColor="#3b82f6" />
        <KpiBox label="Wskaźnik uczestnictwa" value={`${data.summary.participationRate}%`} sub="Pracownicy z ≥1 wypełnionym testem" borderColor="#8b5cf6" />
        <KpiBox label="Łącznie wypełnień" value={String(data.summary.totalResultsSubmitted)} sub="Wszystkie złożone wyniki" borderColor="#f59e0b" />
      </div>

      {/* Interpretacja indeksu */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#14532d', lineHeight: 1.6 }}>
        <strong>Indeks dobrostanu organizacji: {data.summary.avgNormalizedScore} / 100 — {wbLabel}.</strong>{' '}
        Indeks jest ważoną średnią z pięciu standaryzowanych testów: WHO-5 (30%), PSS-10 (20%), PHQ-9 (20%), GAD-7 (15%), MOOD-10 (15%).
        Wyższy wynik oznacza lepszy ogólny dobrostan. Skala: 80–100 Bardzo dobry · 60–79 Dobry · 40–59 Umiarkowany · 0–39 Wymaga uwagi.
      </div>

      {/* ══ SEKCJA 2: OGÓLNY STAN ZDROWIA PSYCHICZNEGO ══════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>2. Ogólny stan zdrowia psychicznego firmy</div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {/* Zone distribution */}
        {zoneDistrib.length > 0 && (
          <div style={{ flex: 1, ...S.card, marginBottom: 0 }}>
            <div style={S.cardTitle}>Strefy dobrostanu działów</div>
            <div style={{ ...S.cardSub }}>Liczba działów w każdej strefie ryzyka</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={zoneDistrib} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${ZONE_LABELS[name ?? ''] ?? name} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {zoneDistrib.map((entry) => (
                    <Cell key={entry.name} fill={ZONE_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [v, ZONE_LABELS[String(n)] ?? String(n)]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {[['stable', '≥ 65'], ['moderate', '45–64'], ['high', '< 45']].map(([k, r]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#374151' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: ZONE_COLORS[k], display: 'inline-block' }} />
                  {ZONE_LABELS[k]} ({r} pkt)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Main risks overview */}
        {data.riskReport.risks.length > 0 && (
          <div style={{ flex: 1, ...S.card, marginBottom: 0 }}>
            <div style={S.cardTitle}>Główne obszary ryzyka</div>
            <div style={S.cardSub}>% aktywnych pracowników z podwyższonym poziomem (ostatnie 30 dni)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.riskReport.risks.map((risk) => (
                <div key={risk.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                      {RISK_ICONS[risk.icon]} {risk.label}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: RISK_COLORS[risk.icon] }}>{risk.currentPct}%</span>
                      <span style={{ fontSize: 11, color: risk.delta > 0 ? '#dc2626' : risk.delta < 0 ? '#059669' : '#9ca3af', marginLeft: 6 }}>
                        {risk.delta > 0 ? `↑ +${risk.delta}%` : risk.delta < 0 ? `↓ ${risk.delta}%` : 'bez zmian'}
                      </span>
                    </div>
                  </div>
                  <ScaleBar value={risk.currentPct} color={RISK_COLORS[risk.icon]} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ SEKCJA 3: RAPORT PER DZIAŁ ══════════════════════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>3. Raport per dział / zespół</div>
      </div>

      {/* Best / Worst highlights */}
      {bestDept && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏆 Najlepszy wellbeing</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#14532d', marginTop: 4 }}>{bestDept.department}</div>
            <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>Indeks dobrostanu: {bestDept.wellbeingIndex} / 100</div>
          </div>
          {worstDept && worstDept.department !== bestDept.department && (
            <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⚠️ Wymaga uwagi</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7f1d1d', marginTop: 4 }}>{worstDept.department}</div>
              <div style={{ fontSize: 13, color: '#dc2626', marginTop: 2 }}>Indeks dobrostanu: {worstDept.wellbeingIndex} / 100</div>
            </div>
          )}
        </div>
      )}

      {/* Dept bar chart */}
      {deptRanking.length > 0 && (
        <div style={{ ...S.card }}>
          <div style={S.cardTitle}>Porównanie działów — indeks dobrostanu (0–100)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptRanking} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} / 100`, 'Indeks dobrostanu']} />
              <Bar dataKey="wellbeingIndex" name="Indeks dobrostanu" radius={[5, 5, 0, 0]}>
                {deptRanking.map((entry) => (
                  <Cell key={entry.department} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Dept ranking table */}
      {data.deptLoad.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={S.cardTitle}>Ranking działów</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Posortowane od najlepszego do najgorszego indeksu dobrostanu. Dane z ostatnich 30 dni.</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['#', 'Dział', 'Pracownicy', 'Uczestnicy', 'Indeks (0–100)', 'Strefa', 'Trend (14 dni)'].map((h, i) => (
                  <th key={h} style={{ ...S.th, textAlign: i <= 1 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.deptLoad]
                .sort((a, b) => {
                  if (a.wellbeingIndex === null) return 1;
                  if (b.wellbeingIndex === null) return -1;
                  return b.wellbeingIndex - a.wellbeingIndex;
                })
                .map((dept, i) => (
                  <tr key={dept.department} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...S.td, color: '#9ca3af', fontFamily: 'monospace', width: 30 }}>{i + 1}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: '#111827' }}>{dept.department}</td>
                    <td style={{ ...S.tdR }}>{dept.deptSize}</td>
                    <td style={{ ...S.tdR }}>{dept.participants}</td>
                    <td style={{ ...S.tdR }}>
                      {dept.wellbeingIndex !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <div style={{ width: 60, background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                            <div style={{ width: `${dept.wellbeingIndex}%`, height: 6, borderRadius: 4, background: dept.color }} />
                          </div>
                          <span style={{ fontWeight: 700, color: dept.color }}>{dept.wellbeingIndex}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ ...S.tdR }}><ZoneBadge load={dept.load} /></td>
                    <td style={{ ...S.tdR }}><TrendLabel trend={dept.trend} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 20px', background: '#f9fafb', fontSize: 11, color: '#9ca3af' }}>
            Strefa: Dobry ≥65 · Umiarkowany 45–64 · Wysoki risk &lt;45 · Trend: zmiana indeksu &gt;5 pkt vs poprzednie 14 dni
          </div>
        </div>
      )}

      {/* ══ SEKCJA 4: RAPORT TRENDÓW ════════════════════════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>4. Raport trendów (zmiany w czasie)</div>
      </div>

      {trendsByWeek.length > 0 ? (
        <>
          <div style={S.card}>
            <div style={S.cardTitle}>Trend średniego wyniku tygodniowo (0–100)</div>
            <div style={S.cardSub}>
              Każdy punkt = średnia ze wszystkich wyników złożonych w danym tygodniu.
              Wyższy wynik = lepszy dobrostan. Obejmuje wszystkie typy testów (o ile nie zastosowano filtra).
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendsByWeek} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v} / 100`, 'Śr. wynik']} />
                <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Śr. wynik" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trend summary boxes */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
            <KpiBox label="Wynik na początku okresu" value={trendFirst !== null ? `${trendFirst} / 100` : '—'} sub={trendsByWeek[0]?.week ?? ''} borderColor="#6366f1" />
            <KpiBox label="Wynik na końcu okresu" value={trendLast !== null ? `${trendLast} / 100` : '—'} sub={trendsByWeek[trendsByWeek.length - 1]?.week ?? ''} borderColor="#10b981" />
            <KpiBox
              label="Zmiana w okresie"
              value={trendDiff !== null ? `${trendDiff > 0 ? '+' : ''}${trendDiff}` : '—'}
              sub={trendDiff !== null ? (trendDiff > 0 ? '↑ Poprawa' : trendDiff < 0 ? '↓ Pogorszenie' : 'Stabilny') : ''}
              borderColor={trendDiff !== null && trendDiff > 0 ? '#22c55e' : trendDiff !== null && trendDiff < 0 ? '#ef4444' : '#94a3b8'}
            />
            <KpiBox label="Tygodni w raporcie" value={String(trendsByWeek.length)} sub="Tygodniowe punkty danych" borderColor="#f59e0b" />
          </div>

          {/* Trend detail table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={S.cardTitle}>Szczegóły tygodniowe</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={S.th}>Tydzień od</th>
                  <th style={S.th}>Test</th>
                  <th style={S.thR}>Śr. wynik (0–100)</th>
                  <th style={S.thR}>Wypełnień</th>
                  <th style={S.thR}>Interpretacja</th>
                </tr>
              </thead>
              <tbody>
                {data.trends.map((t, idx) => {
                  const interp = t.avgScore >= 80 ? 'Bardzo dobry' : t.avgScore >= 60 ? 'Dobry' : t.avgScore >= 40 ? 'Umiarkowany' : 'Wymaga uwagi';
                  const interpColor = t.avgScore >= 80 ? '#15803d' : t.avgScore >= 60 ? '#ca8a04' : t.avgScore >= 40 ? '#c2410c' : '#b91c1c';
                  return (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={S.td}>{t.week}</td>
                      <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{t.assessmentCode}</td>
                      <td style={{ ...S.tdR, fontWeight: 700 }}>{t.avgScore} / 100</td>
                      <td style={S.tdR}>{t.count}</td>
                      <td style={{ ...S.tdR, color: interpColor, fontWeight: 600 }}>{interp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ ...S.card, textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Brak danych trendów dla wybranego okresu</div>
      )}

      {/* ══ SEKCJA 5: RAPORT RYZYK ══════════════════════════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>5. Raport ryzyk — obszary podwyższonego zagrożenia</div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 18px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
        Dane z ostatnich 30 dni vs poprzednie 30 dni. Procent obliczany z {data.riskReport.totalActive} aktywnych pracowników.
        Dane w pełni zagregowane — nie identyfikują konkretnych osób.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {data.riskReport.risks.map((risk) => {
          const detail = RISK_DETAILS[risk.icon];
          return (
            <div key={risk.key} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: `2px solid ${RISK_COLORS[risk.icon]}22` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{RISK_ICONS[risk.icon]} {risk.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Test: {detail?.test} · Próg: {detail?.threshold}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: RISK_COLORS[risk.icon] }}>{risk.currentPct}%</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{risk.currentCount} os. / {data.riskReport.totalActive}</div>
                </div>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 6, height: 8, marginBottom: 10 }}>
                <div style={{ width: `${Math.min(risk.currentPct, 100)}%`, height: 8, borderRadius: 6, background: RISK_COLORS[risk.icon] }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}>
                <span style={{ color: '#6b7280' }}>Poprzedni okres: {risk.previousPct}%</span>
                <span style={{ fontWeight: 700, color: risk.delta > 0 ? '#dc2626' : risk.delta < 0 ? '#16a34a' : '#6b7280' }}>
                  {risk.delta > 0 ? `↑ +${risk.delta}%` : risk.delta < 0 ? `↓ ${risk.delta}%` : 'Bez zmian'}
                </span>
              </div>
              {detail && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                  <strong style={{ color: '#374151' }}>Co oznacza:</strong> {detail.what}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Risks comparison bar chart */}
      {data.riskReport.risks.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Porównanie ryzyk — bieżący vs poprzedni okres 30-dniowy</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data.riskReport.risks.map((r) => ({ name: r.label, 'Poprzedni': r.previousPct, 'Bieżący': r.currentPct }))}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v) => [`${v}%`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Poprzedni" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bieżący" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ══ SEKCJA 6: ZMIANY KRYTYCZNE ══════════════════════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>6. Zmiany krytyczne — nagłe zmiany w działach</div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 18px', marginBottom: 16, fontSize: 12, color: '#475569' }}>
        Porównanie indeksu dobrostanu działu: ostatnie 14 dni vs poprzednie 14 dni.
        Próg alertu: zmiana &gt;8 pkt. Krytyczny: zmiana &gt;15 pkt.
      </div>

      {data.criticalChanges.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', color: '#16a34a', padding: '24px', fontSize: 15, fontWeight: 700 }}>
          ✅ Brak zmian krytycznych — wszystkie działy stabilne
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <KpiBox label="Pogorszeń krytycznych" value={String(worseningChanges.filter((c) => c.severity === 'critical').length)} sub="Zmiana > 15 pkt" borderColor="#ef4444" />
            <KpiBox label="Pogorszeń ostrzegawczych" value={String(worseningChanges.filter((c) => c.severity === 'warning').length)} sub="Zmiana > 8 pkt" borderColor="#f97316" />
            <KpiBox label="Popraw w działach" value={String(improvingChanges.length)} sub="Znaczna poprawa" borderColor="#22c55e" />
          </div>

          {/* Changes list */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={S.th}>Dział</th>
                  <th style={S.thR}>Poprzednio</th>
                  <th style={S.thR}>Teraz</th>
                  <th style={S.thR}>Zmiana</th>
                  <th style={S.thR}>Kierunek</th>
                  <th style={S.thR}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.criticalChanges.map((c, idx) => (
                  <tr key={c.department} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{c.department}</td>
                    <td style={S.tdR}>{c.prevIndex}</td>
                    <td style={{ ...S.tdR, fontWeight: 700, color: c.direction === 'worsening' ? '#dc2626' : '#16a34a' }}>{c.recentIndex}</td>
                    <td style={{ ...S.tdR, fontWeight: 700, color: c.direction === 'worsening' ? '#dc2626' : '#16a34a' }}>
                      {c.direction === 'worsening' ? '-' : '+'}{c.drop} pkt
                    </td>
                    <td style={S.tdR}><TrendLabel trend={c.direction === 'worsening' ? 'worsening' : 'improving'} /></td>
                    <td style={S.tdR}>
                      <span style={{ background: c.severity === 'critical' ? '#fef2f2' : c.direction === 'worsening' ? '#fff7ed' : '#f0fdf4', color: c.severity === 'critical' ? '#b91c1c' : c.direction === 'worsening' ? '#c2410c' : '#15803d', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {c.severity === 'critical' ? 'KRYTYCZNY' : c.direction === 'worsening' ? 'OSTRZEŻENIE' : 'POPRAWA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══ SEKCJA 7: ROZKŁAD NASILENIA OBJAWÓW ═════════════════════════════ */}
      <div style={S.sectionDivider}>
        <div style={S.sectionLabel}>7. Rozkład nasilenia objawów</div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {pieData.length > 0 && (
          <div style={{ flex: 1, ...S.card, marginBottom: 0 }}>
            <div style={S.cardTitle}>Nasilenie objawów — wykres kołowy</div>
            <div style={S.cardSub}>Rozkład wszystkich wyników wg klasyfikacji nasilenia</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${SEVERITY_LABELS[name ?? ''] ?? name} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [v, SEVERITY_LABELS[String(n)] ?? String(n)]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Severity table */}
        {data.severity.length > 0 && (
          <div style={{ flex: 1, ...S.card, padding: 0, overflow: 'hidden', marginBottom: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={S.cardTitle}>Tabela nasilenia</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={S.th}>Poziom nasilenia</th>
                  <th style={S.thR}>Liczba wyników</th>
                  <th style={S.thR}>% wszystkich</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const total = data.severity.reduce((s, i) => s + i.count, 0);
                  return data.severity.map((s, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={S.td}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SEVERITY_COLORS[s.severity] ?? '#94a3b8', marginRight: 8, verticalAlign: 'middle' }} />
                        {SEVERITY_LABELS[s.severity] ?? s.severity}
                      </td>
                      <td style={{ ...S.tdR, fontWeight: 700 }}>{s.count}</td>
                      <td style={S.tdR}>{total > 0 ? Math.round((s.count / total) * 100) : 0}%</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, textAlign: 'center', fontSize: 11, color: '#9ca3af', lineHeight: 1.8 }}>
        <div>Raport wygenerowany przez <strong style={{ color: '#10b981' }}>MoodFlow</strong> · {new Date(data.generatedAt).toLocaleString('pl-PL')}</div>
        <div>Dane zagregowane i anonimowe — nie zawierają danych osobowych · MoodFlow nie jest narzędziem diagnostyki klinicznej</div>
        <div>Indeks dobrostanu: WHO-5 (30%) + PSS-10 (20%) + PHQ-9 (20%) + GAD-7 (15%) + MOOD-10 (15%)</div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

export default function HrGeneratePage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [form, setForm] = useState({ dateFrom: '', dateTo: '', department: '', assessmentCode: '' });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    setForm((f) => ({ ...f, dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) }));
    Promise.all([
      axiosClient.get<AssessmentOption[]>('/analytics/assessments'),
      axiosClient.get<DepartmentStat[]>('/analytics/departments'),
    ]).then(([asmRes, deptRes]) => {
      setAssessments(asmRes.data);
      setDepartments(deptRes.data.map((d) => d.department));
    }).catch(() => {});
  }, [router]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const dateFrom = new Date(form.dateFrom);
      const dateTo = new Date(form.dateTo);
      const days = Math.max(1, Math.round((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)));
      const qs = form.assessmentCode ? `&assessmentCode=${form.assessmentCode}` : '';

      const [summaryRes, trendsRes, deptStatsRes, deptLoadRes, severityRes, riskRes, critRes] = await Promise.all([
        axiosClient.get<Summary>('/analytics/summary'),
        axiosClient.get<TrendPoint[]>(`/analytics/trends?days=${days}${qs}`),
        axiosClient.get<DepartmentStat[]>('/analytics/departments'),
        axiosClient.get<DeptLoad[]>('/analytics/department-wellbeing-load'),
        axiosClient.get<SeverityItem[]>(`/analytics/severity-distribution${form.assessmentCode ? `?assessmentCode=${form.assessmentCode}` : ''}`),
        axiosClient.get<RiskReport>('/analytics/risk-report'),
        axiosClient.get<CriticalChange[]>('/analytics/critical-changes'),
      ]);

      const deptFiltered = form.department
        ? deptStatsRes.data.filter((d) => d.department === form.department)
        : deptStatsRes.data;

      const deptLoadFiltered = form.department
        ? deptLoadRes.data.filter((d) => d.department === form.department)
        : deptLoadRes.data;

      setReportData({
        generatedAt: new Date().toISOString(),
        filters: { ...form },
        summary: summaryRes.data,
        trends: trendsRes.data,
        deptStats: deptFiltered,
        deptLoad: deptLoadFiltered,
        severity: severityRes.data.map((s) => ({ severity: s.severity, count: s.count })),
        riskReport: riskRes.data,
        criticalChanges: critRes.data,
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!reportData) return;
    setExporting(true);
    try {
      const doc = buildReportPdf(reportData);
      doc.save(`raport-moodflow-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Wygeneruj raport</h2>
        <p className="text-sm text-gray-400 mt-0.5">Pełny raport PDF ze wszystkimi sekcjami dobrostanu</p>
      </div>

      {/* Filter form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-base font-semibold text-gray-700 mb-1">Parametry raportu</h3>
        <p className="text-xs text-gray-400 mb-4">
          Zakres dat wpływa na dane trendów. Dane ryzyk i zmian krytycznych zawsze obejmują ostatnie 30 / 14 dni.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data od</label>
            <input type="date" value={form.dateFrom}
              onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data do</label>
            <input type="date" value={form.dateTo}
              onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Dział (opcjonalnie)</label>
            <select value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Cała firma</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Test (opcjonalnie)</label>
            <select value={form.assessmentCode}
              onChange={(e) => setForm((f) => ({ ...f, assessmentCode: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Wszystkie testy</option>
              {assessments.map((a) => <option key={a.code} value={a.code}>{a.name} ({a.code})</option>)}
            </select>
          </div>
        </div>

        {/* Quick period presets */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Szybki wybór:</span>
          {[
            { label: '7 dni', days: 7 },
            { label: '30 dni', days: 30 },
            { label: '90 dni', days: 90 },
            { label: '6 miesięcy', days: 180 },
          ].map(({ label, days }) => (
            <button
              key={days}
              onClick={() => {
                const to = new Date();
                const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
                setForm((f) => ({ ...f, dateFrom: from.toISOString().slice(0, 10), dateTo: to.toISOString().slice(0, 10) }));
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition"
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !form.dateFrom || !form.dateTo}
          className="mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition flex items-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generowanie raportu...
            </>
          ) : '📄 Generuj raport'}
        </button>
      </div>

      {/* Report preview */}
      {reportData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-700">Podgląd raportu</h3>
              <p className="text-xs text-gray-400 mt-0.5">7 sekcji · dane zagregowane i anonimowe</p>
            </div>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Eksportowanie...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Pobierz PDF
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-[#f8fafc]">
            <div>
              <ReportDocument data={reportData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
