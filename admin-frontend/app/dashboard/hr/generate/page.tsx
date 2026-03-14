'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import axiosClient from '../../../../lib/axiosClient';
import { getAccessToken } from '../../../../lib/auth';

/* ─── Types ─── */
interface AssessmentOption { code: string; name: string; }
interface TrendPoint { week: string; avgScore: number; count: number; assessmentCode: string; }
interface DepartmentStat {
  department: string; activeUsers: number; participantCount: number;
  submissions: number; avgScore: number | null; participationRate: number;
}
interface SeverityItem { severity: string; count: number; }

interface ReportData {
  generatedAt: string;
  filters: { dateFrom: string; dateTo: string; department: string; assessmentCode: string };
  trends: TrendPoint[];
  deptStats: DepartmentStat[];
  severity: SeverityItem[];
  totalSubmissions: number;
  avgScore: number | null;
}

/* ─── Constants ─── */
const SEVERITY_COLORS: Record<string, string> = {
  minimal: '#22c55e', mild: '#84cc16', moderate: '#f59e0b',
  'moderately-severe': '#f97316', severe: '#ef4444',
  high: '#ef4444', low: '#22c55e', average: '#3b82f6',
  'low-distress': '#22c55e', 'moderate-distress': '#f59e0b', 'high-distress': '#ef4444',
};
const SEVERITY_LABELS: Record<string, string> = {
  minimal: 'Minimalne', mild: 'Łagodne', moderate: 'Umiarkowane',
  'moderately-severe': 'Umiark. ciężkie', severe: 'Ciężkie',
  high: 'Wysokie', low: 'Niskie', average: 'Przeciętne',
  'low-distress': 'Niski stres', 'moderate-distress': 'Umiark. stres', 'high-distress': 'Wysoki stres',
};
const DEPT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

/* ─── Helper ─── */
function SummaryBox({ label, value, border }: { label: string; value: string; border: string }) {
  return (
    <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px', borderLeft: `4px solid ${border}`, background: '#fff' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  );
}

/* ─── Report Component (rendered in DOM, then captured) ─── */
function ReportDocument({ data }: { data: ReportData }) {
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

  const pieData = Object.entries(
    data.severity.reduce<Record<string, number>>((acc, s) => {
      acc[s.severity] = (acc[s.severity] ?? 0) + s.count;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div style={{ width: 900, fontFamily: 'Inter, system-ui, sans-serif', background: '#f9fafb', padding: 32 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', marginBottom: 24, borderLeft: '6px solid #6366f1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Raport dobrostanu pracowników</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>MoodFlow — dane zagregowane i anonimowe</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af' }}>
            <div>Wygenerowano</div>
            <div style={{ fontWeight: 600, color: '#374151' }}>{new Date(data.generatedAt).toLocaleString('pl-PL')}</div>
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: '#f3f4f6', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#374151' }}>
            Okres: {data.filters.dateFrom} — {data.filters.dateTo}
          </span>
          {data.filters.department && (
            <span style={{ background: '#ede9fe', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#5b21b6' }}>
              Dział: {data.filters.department}
            </span>
          )}
          {data.filters.assessmentCode && (
            <span style={{ background: '#d1fae5', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#065f46' }}>
              Test: {data.filters.assessmentCode}
            </span>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <SummaryBox label="Łącznie wypełnień testów" value={String(data.totalSubmissions)} border="#6366f1" />
        <SummaryBox
          label="Średni wynik (0–100)"
          value={data.avgScore !== null ? `${data.avgScore} / 100` : '—'}
          border="#10b981"
        />
        <SummaryBox label="Działów w raporcie" value={String(data.deptStats.length)} border="#f59e0b" />
      </div>

      {/* Trend chart */}
      {trendsByWeek.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
            Trend średniego wyniku (tygodniowo)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendsByWeek} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(v) => [`${v} / 100`, 'Śr. wynik']}
              />
              <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Śr. wynik" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two charts row: dept bar + severity pie */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {/* Department bar chart */}
        {data.deptStats.length > 0 && (
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              Uczestnictwo wg działu (%)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.deptStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
                  formatter={(v, n) => [`${v}${n === 'participationRate' ? '%' : ' / 100'}`, n === 'participationRate' ? 'Uczestnictwo' : 'Śr. wynik']}
                />
                <Legend formatter={(v) => v === 'participationRate' ? 'Uczestnictwo (%)' : 'Śr. wynik'} />
                <Bar dataKey="participationRate" fill="#10b981" radius={[4, 4, 0, 0]} name="participationRate" />
                <Bar dataKey="avgScore" fill="#6366f1" radius={[4, 4, 0, 0]} name="avgScore" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Severity pie */}
        {pieData.length > 0 && (
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              Rozkład nasilenia objawów
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${SEVERITY_LABELS[name ?? ''] ?? name} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
                  formatter={(v, n) => [v, SEVERITY_LABELS[String(n)] ?? String(n)]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Department table */}
      {data.deptStats.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Statystyki działów</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Dane zagregowane — bez identyfikacji indywidualnych osób</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Dział', 'Aktywni', 'Uczestników', 'Wypełnień', 'Śr. wynik', 'Uczestnictwo'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.deptStats.map((dept, idx) => (
                <tr key={dept.department} style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>{dept.department}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>{dept.activeUsers}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>{dept.participantCount}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>{dept.submissions}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>
                    {dept.avgScore !== null ? `${dept.avgScore} / 100` : '—'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: dept.participationRate >= 50 ? '#059669' : dept.participationRate >= 25 ? '#d97706' : '#dc2626' }}>
                      {dept.participationRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Severity table */}
      {data.severity.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Rozkład nasilenia objawów</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poziom nasilenia</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liczba przypadków</th>
              </tr>
            </thead>
            <tbody>
              {data.severity.map((s, idx) => (
                <tr key={s.severity} style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: SEVERITY_COLORS[s.severity] ?? '#94a3b8', marginRight: 8, verticalAlign: 'middle' }} />
                    {SEVERITY_LABELS[s.severity] ?? s.severity}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trend table */}
      {data.trends.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Szczegóły trendów tygodniowych</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Tydzień', 'Test', 'Śr. wynik', 'Wypełnień'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i <= 1 ? 'left' : 'right', fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.trends.map((t, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 16px', color: '#374151' }}>{t.week}</td>
                  <td style={{ padding: '10px 16px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>{t.assessmentCode}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>{t.avgScore} / 100</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: '#374151' }}>{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingTop: 8 }}>
        Raport wygenerowany przez MoodFlow · Dane zagregowane, anonimowe · {new Date(data.generatedAt).toLocaleString('pl-PL')}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function HrGeneratePage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);
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
      const qs = form.assessmentCode ? `?assessmentCode=${form.assessmentCode}` : '';
      const [trendsRes, deptRes, severityRes] = await Promise.all([
        axiosClient.get<TrendPoint[]>(`/analytics/trends${qs}`),
        axiosClient.get<DepartmentStat[]>('/analytics/departments'),
        axiosClient.get<SeverityItem[]>(`/analytics/severity-distribution${qs}`),
      ]);
      const deptFiltered = form.department
        ? deptRes.data.filter((d) => d.department === form.department)
        : deptRes.data;
      const totalSubmissions = deptFiltered.reduce((s, d) => s + d.submissions, 0);
      const scored = deptFiltered.filter((d) => d.avgScore !== null);
      const avgScore = scored.length > 0
        ? Math.round(scored.reduce((s, d) => s + (d.avgScore ?? 0), 0) / scored.length * 10) / 10
        : null;
      setReportData({
        generatedAt: new Date().toISOString(),
        filters: { ...form },
        trends: trendsRes.data,
        deptStats: deptFiltered,
        severity: severityRes.data.map((s) => ({ severity: s.severity, count: s.count })),
        totalSubmissions,
        avgScore,
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleExportPdf() {
    if (!reportRef.current || !reportData) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f9fafb',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pageW = 210; // A4 mm
      const pageH = 297;
      const margin = 10;
      const usableW = pageW - margin * 2;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = (usableW / imgW) * (canvas.width / canvas.width); // px -> mm
      const mmPerPx = usableW / imgW;
      const imgHmm = imgH * mmPerPx;
      const totalPages = Math.ceil(imgHmm / (pageH - margin * 2));

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        const srcY = page * ((pageH - margin * 2) / mmPerPx);
        const srcH = Math.min((pageH - margin * 2) / mmPerPx, imgH - srcY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgW;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

        const pageImg = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImg, 'PNG', margin, margin, usableW, srcH * mmPerPx);
      }

      const filename = `raport-moodflow-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Wygeneruj raport</h2>
        <p className="text-sm text-gray-400 mt-0.5">Raport PDF z wykresami i statystykami</p>
      </div>

      {/* Filter form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Parametry raportu</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data od</label>
            <input
              type="date"
              value={form.dateFrom}
              onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Data do</label>
            <input
              type="date"
              value={form.dateTo}
              onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Dział</label>
            <select
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Cała firma</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Test</label>
            <select
              value={form.assessmentCode}
              onChange={(e) => setForm((f) => ({ ...f, assessmentCode: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Wszystkie testy</option>
              {assessments.map((a) => (
                <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition"
        >
          {generating ? 'Generowanie...' : 'Generuj raport'}
        </button>
      </div>

      {/* Report preview + export */}
      {reportData && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-700">Podgląd raportu</h3>
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

          {/* Preview box */}
          <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-[#f9fafb]">
            <div ref={reportRef}>
              <ReportDocument data={reportData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
