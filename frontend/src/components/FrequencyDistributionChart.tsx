import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Search } from 'lucide-react';

const FREQ_COLORS: Record<string, string> = {
  Always:    '#ef4444',
  Often:     '#f97316',
  Sometimes: '#f59e0b',
  Rarely:    '#22c55e',
  Never:     '#3b82f6',
};

const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

interface DistEntry { label: string; count: number; percent: number; }
interface QuestionData { question: string; total: number; distribution: DistEntry[]; }

export default function FrequencyDistributionChart() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const { data, isLoading, error } = useQuery({
    queryKey: ['frequencyDistribution'],
    queryFn: analyticsApi.getFrequencyDistribution,
  });

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
  const allQuestions: QuestionData[] = responseData.perQuestion ?? [];

  const filtered = search.trim()
    ? allQuestions.filter((q) => q.question.toLowerCase().includes(search.toLowerCase()))
    : allQuestions;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5 rounded-2xl">
        <h3 className="text-base font-bold text-amber-900 mb-1">
          Frequency Response Distribution — Per Question
        </h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          One pie chart per frequency-type question showing the exact percentage split of
          Always / Often / Sometimes / Rarely / Never responses.
          Yes / No questions are excluded. Showing <strong>{filtered.length}</strong> of{' '}
          <strong>{allQuestions.length}</strong> questions.
        </p>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      {/* Grid of per-question pie charts */}
      {paginated.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-10">No questions match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map((item, idx) => {
            const pieData = item.distribution
              .filter((d) => d.count > 0)
              .map((d) => ({ name: d.label, value: d.count, percent: d.percent }));

            // Find dominant response
            const dominant = item.distribution.reduce((max, d) => d.count > max.count ? d : max, item.distribution[0]);

            return (
              <div
                key={idx}
                className="card flex flex-col items-center hover:shadow-md transition-shadow duration-200"
              >
                {/* Question title */}
                <p className="text-[11px] font-semibold text-slate-700 text-center leading-snug mb-1 line-clamp-3 w-full">
                  {item.question}
                </p>
                <span className="text-[10px] text-slate-400 mb-2">{item.total} responses</span>

                {/* Donut pie */}
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      outerRadius={62}
                      innerRadius={32}
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
                <div
                  className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full mb-2"
                  style={{ backgroundColor: FREQ_COLORS[dominant?.label] ?? '#94a3b8' }}
                >
                  Most common: {dominant?.label} ({dominant?.percent}%)
                </div>

                {/* Mini percentage bars */}
                <div className="w-full space-y-1 px-1">
                  {ORDER.map((label) => {
                    const d = item.distribution.find((x) => x.label === label);
                    return (
                      <div key={label} className="flex items-center gap-2 text-[10px]">
                        <span className="w-14 text-slate-500 font-medium text-left">{label}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${d?.percent ?? 0}%`, backgroundColor: FREQ_COLORS[label] }}
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages} ({filtered.length} questions)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
