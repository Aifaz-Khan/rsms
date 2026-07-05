import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { Download } from 'lucide-react';

const FREQ_COLORS: Record<string, string> = {
  Always:    '#ef4444',
  Often:     '#f97316',
  Sometimes: '#f59e0b',
  Rarely:    '#22c55e',
  Never:     '#3b82f6',
};

const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

// Short display labels for section tabs
function shortSectionName(title: string): string {
  // Already short indriya names — return as-is
  return title;
}

// Colour for section tab header
function sectionColor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('chakshu') || t.includes('eye'))   return '#0ea5e9';
  if (t.includes('karna')   || t.includes('ear'))   return '#8b5cf6';
  if (t.includes('ghrana')  || t.includes('nose'))  return '#10b981';
  if (t.includes('rasana')  || t.includes('tongue')) return '#ec4899';
  if (t.includes('sparsha') || t.includes('skin'))  return '#f59e0b';
  if (t.includes('manas')   || t.includes('mind'))  return '#6366f1';
  if (t.includes('risk')    || t.includes('lifestyle')) return '#ef4444';
  return '#64748b';
}

interface DistEntry { label: string; count: number; percent: number; }
interface QuestionData { question: string; total: number; distribution: DistEntry[]; }
interface SectionData  { section: string; totalAnswers: number; questions: QuestionData[]; }

const FREQ_COLORS_MAP: Record<string,string> = {
  Always: '#ef4444', Often: '#f97316', Sometimes: '#f59e0b', Rarely: '#22c55e', Never: '#3b82f6',
};
const ORDER_LABELS = ['Always','Often','Sometimes','Rarely','Never'];

/** Build an inline SVG donut chart for one question's distribution */
function buildSVGPie(distribution: DistEntry[], size = 110): string {
  const cx = size / 2, cy = size / 2;
  const R = size * 0.42, ir = size * 0.22;
  const total = distribution.reduce((s, d) => s + d.count, 0);
  if (total === 0) return `<svg width="${size}" height="${size}"><circle cx="${cx}" cy="${cy}" r="${R}" fill="#f1f5f9"/></svg>`;

  let paths = '';
  let start = -Math.PI / 2;
  distribution.filter(d => d.count > 0).forEach(d => {
    const angle = (d.count / total) * 2 * Math.PI;
    const end = start + angle;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const ix1 = cx + ir * Math.cos(start), iy1 = cy + ir * Math.sin(start);
    const ix2 = cx + ir * Math.cos(end),   iy2 = cy + ir * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${ix1},${iy1} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${ir},${ir},0,${large},0,${ix1},${iy1}Z" fill="${FREQ_COLORS_MAP[d.label] ?? '#94a3b8'}"/>`;
    start = end;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
}

/** Build full print-ready HTML for a list of sections, with SVG pie charts */
function buildPrintHTML(sections: SectionData[], title: string): string {
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const legendHTML = ORDER_LABELS.map(l =>
    `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;margin:2px 6px">
      <span style="width:10px;height:10px;border-radius:50%;background:${FREQ_COLORS_MAP[l]};display:inline-block"></span>${l}
    </span>`
  ).join('');

  const sectionsHTML = sections.map((s, si) => {
    const questionsHTML = s.questions.map((q, qi) => {
      const dominant = q.distribution.reduce((mx, d) => d.count > mx.count ? d : mx, q.distribution[0]);
      const pieSVG = buildSVGPie(q.distribution);

      const barsHTML = ORDER_LABELS.map(label => {
        const d = q.distribution.find(x => x.label === label);
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:10px">
          <span style="width:52px;color:#64748b;flex-shrink:0">${label}</span>
          <div style="flex:1;background:#f1f5f9;border-radius:3px;height:7px;overflow:hidden">
            <div style="width:${d?.percent ?? 0}%;background:${FREQ_COLORS_MAP[label]};height:7px;border-radius:3px"></div>
          </div>
          <span style="width:28px;text-align:right;color:#94a3b8">${d?.percent ?? 0}%</span>
          <span style="width:34px;text-align:right;color:#475569;font-weight:600">(${d?.count ?? 0})</span>
        </div>`;
      }).join('');

      return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;break-inside:avoid;margin-bottom:10px;background:#fff">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:6px">
          <span style="background:#f1f5f9;color:#475569;font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;white-space:nowrap;margin-top:1px">Q${qi+1}</span>
          <p style="margin:0;font-size:11px;font-weight:700;color:#1e293b;line-height:1.4">${q.question}</p>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <div style="flex-shrink:0">${pieSVG}</div>
          <div style="flex:1">
            <p style="margin:0 0 5px;font-size:10px;color:#94a3b8">
              ${q.total} responses &nbsp;·&nbsp;
              <strong style="color:${FREQ_COLORS_MAP[dominant?.label] ?? '#94a3b8'}">Most: ${dominant?.label} (${dominant?.percent}%)</strong>
            </p>
            ${barsHTML}
          </div>
        </div>
      </div>`;
    }).join('');

    const sectionColor = ['#0ea5e9','#8b5cf6','#10b981','#ec4899','#f59e0b','#6366f1','#ef4444','#64748b'][si % 8];
    return `<div style="margin-bottom:24px">
      <div style="border-left:4px solid ${sectionColor};padding:8px 12px;background:${sectionColor}10;border-radius:0 8px 8px 0;margin-bottom:10px">
        <h2 style="font-size:14px;font-weight:800;color:#1e293b;margin:0 0 2px">${s.section}</h2>
        <p style="font-size:10px;color:#64748b;margin:0">${s.questions.length} questions · ${s.totalAnswers.toLocaleString()} total responses</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">${questionsHTML}</div>
    </div>
    ${si < sections.length - 1 ? '<hr style="border:none;border-top:1px dashed #e2e8f0;margin:16px 0">' : ''}`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:20px;color:#1e293b;background:#fff}
      @media print{body{padding:8px}@page{margin:12mm;size:A4}}
    </style>
    </head><body>
    <div style="border-bottom:2px solid #e2e8f0;padding-bottom:14px;margin-bottom:18px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
        <div>
          <h1 style="font-size:18px;font-weight:900;color:#1e293b;margin:0 0 3px">${title}</h1>
          <p style="font-size:11px;color:#64748b;margin:0">AYURGRAM 3.0: Swastha Indriya, Swastha India &nbsp;·&nbsp; Generated on ${date}</p>
        </div>
        <div style="text-align:right;font-size:10px;color:#94a3b8">
          <p style="margin:0">${sections.length} section${sections.length > 1 ? 's' : ''}</p>
          <p style="margin:0">${sections.reduce((s, sec) => s + sec.questions.length, 0)} questions</p>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:2px">${legendHTML}</div>
    </div>
    ${sectionsHTML}
  </body></html>`;
}

export default function FrequencyDistributionChart() {
  const [activeSection, setActiveSection] = useState<number>(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['frequencyDistribution'],
    queryFn: analyticsApi.getFrequencyDistribution,
  });

  const openPrintWindow = useCallback((sections: SectionData[], title: string) => {
    const html = buildPrintHTML(sections, title);
    const win = window.open('', '_blank', 'width=1100,height=800,scrollbars=yes');
    if (!win) { alert('Please allow popups to download PDF'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.addEventListener('load', () => { setTimeout(() => win.print(), 400); });
    setTimeout(() => win.print(), 800);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-sm text-red-600 py-10">Failed to load frequency data.</div>;
  }

  const responseData = data?.data?.data ?? data?.data ?? {};
  const sections: SectionData[] = responseData.bySectionTitle ?? [];

  if (sections.length === 0) {
    return <div className="text-center text-sm text-slate-400 py-10">No frequency data available.</div>;
  }

  const current = sections[activeSection];
  const color   = sectionColor(current.section);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5 rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, borderTop: `3px solid ${color}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-base font-bold mb-1" style={{ color }}>
              Frequency Response Distribution — Section-wise
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              One pie chart per frequency-type question, grouped by survey section.
              Select a section below to explore. Yes / No questions are excluded.
              Total <strong>{sections.length} sections</strong> · <strong>{sections.reduce((s,sec)=>s+sec.questions.length,0)} questions</strong>.
            </p>
          </div>
          <button
            onClick={() => handleDownloadPDF(sections)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>


      {/* Shared legend */}
      <div className="card py-3">
        <div className="flex flex-wrap items-center gap-5 justify-center">
          {ORDER.map((label) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FREQ_COLORS[label] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Section selector tabs — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {sections.map((s, i) => {
          const col = sectionColor(s.section);
          const isActive = i === activeSection;
          return (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={clsx(
                'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border',
                isActive
                  ? 'text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
              )}
              style={isActive ? { backgroundColor: col, borderColor: col } : {}}
            >
              <span>{shortSectionName(s.section)}</span>
              <span
                className={clsx('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                  isActive ? 'bg-white/25' : 'bg-slate-100'
                )}
                style={isActive ? {} : { color: col }}
              >
                {s.questions.length}Q
              </span>
            </button>
          );
        })}
      </div>

      {/* Active section details */}
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: `${color}40`, backgroundColor: `${color}06` }}
      >
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold" style={{ color }}>{current.section}</h4>
          <span className="text-xs text-slate-400">
            {current.questions.length} questions · {current.totalAnswers.toLocaleString()} total responses
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-4">
          Each pie below shows how respondents in this section distributed their answers across the five frequency levels.
        </p>

        {/* Pie chart grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {current.questions.map((item, idx) => {
            const pieData = item.distribution
              .filter((d) => d.count > 0)
              .map((d) => ({ name: d.label, value: d.count, percent: d.percent }));

            const dominant = item.distribution.reduce(
              (max, d) => (d.count > max.count ? d : max),
              item.distribution[0]
            );

            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex flex-col items-center hover:shadow-md transition-shadow duration-200"
              >
                {/* Question number badge + title */}
                <div className="w-full mb-2 flex items-start gap-2">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    Q{idx + 1}
                  </span>
                  <p className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-3">
                    {item.question}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 mb-1">{item.total} responses</span>

                {/* Donut pie */}
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      outerRadius={58}
                      innerRadius={28}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={FREQ_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const pct = item.total > 0 ? Math.round((value / item.total) * 100) : 0;
                        return [`${value} (${pct}%)`, name];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Dominant answer badge */}
                {dominant && (
                  <div
                    className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: FREQ_COLORS[dominant.label] ?? '#94a3b8' }}
                  >
                    Most: {dominant.label} ({dominant.percent}%)
                  </div>
                )}

                {/* Mini progress bars */}
                <div className="w-full space-y-1 px-1">
                  {ORDER.map((label) => {
                    const d = item.distribution.find((x) => x.label === label);
                    return (
                      <div key={label} className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-slate-500 font-medium text-left">{label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${d?.percent ?? 0}%`,
                              backgroundColor: FREQ_COLORS[label],
                            }}
                          />
                        </div>
                        <span className="w-8 text-right text-slate-400">{d?.percent ?? 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom section navigator */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setActiveSection((p) => Math.max(0, p - 1))}
          disabled={activeSection === 0}
          className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          ← Previous section
        </button>
        <span className="text-xs text-slate-400">
          {activeSection + 1} / {sections.length} sections
        </span>
        <button
          onClick={() => setActiveSection((p) => Math.min(sections.length - 1, p + 1))}
          disabled={activeSection === sections.length - 1}
          className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
        >
          Next section →
        </button>
      </div>
    </div>
  );
}
