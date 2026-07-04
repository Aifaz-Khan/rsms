import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie,
} from 'recharts';

const SENSE_COLORS: Record<string, string> = {
  Eyes:    '#0ea5e9',
  Ears:    '#8b5cf6',
  Nose:    '#10b981',
  Tongue:  '#ec4899',
  Skin:    '#f59e0b',
};

export default function PrimaryScreeningChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['primaryScores'],
    queryFn: analyticsApi.getPrimaryScores,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-sm text-red-600 py-10">Failed to load primary scores.</div>;
  }

  const rawData: any[] = data?.data?.data || data?.data || [];

  // Enrich with percentages
  const enriched = rawData.map((d: any) => {
    const total = (d.yesCount || 0) + (d.noCount || 0);
    const yesPct = total > 0 ? Math.round((d.yesCount / total) * 100) : 0;
    const noPct  = total > 0 ? Math.round((d.noCount  / total) * 100) : 0;
    return { ...d, total, yesPct, noPct };
  });

  // Bar chart data — percent
  const barData = enriched.map((d) => ({
    sense: d.sense,
    'Yes (%)': d.yesPct,
    'No (%)': d.noPct,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 p-5 rounded-2xl">
        <h3 className="text-base font-bold text-emerald-900 mb-1">
          Primary Screening Scores — Yes / No Analysis
        </h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          Percentage of participants who answered <strong>Yes</strong> (symptomatic) vs <strong>No</strong> (asymptomatic)
          for the primary screening questions across all five sense organs. All values are percentages of total respondents per sense.
        </p>
      </div>

      {/* Stat cards — one per sense */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {enriched.map((d) => (
          <div
            key={d.sense}
            className="card flex flex-col items-center text-center py-5"
            style={{ borderTop: `3px solid ${SENSE_COLORS[d.sense] ?? '#94a3b8'}` }}
          >
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{d.sense}</p>
            <p className="text-3xl font-bold" style={{ color: SENSE_COLORS[d.sense] ?? '#94a3b8' }}>
              {d.yesPct}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">symptomatic</p>
            <div className="w-full mt-3 space-y-1.5 px-1">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="flex-1 text-left text-slate-500">Yes</span>
                <span className="font-semibold text-slate-700">{d.yesPct}% <span className="text-slate-400 font-normal">({d.yesCount})</span></span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
                <span className="flex-1 text-left text-slate-500">No</span>
                <span className="font-semibold text-slate-700">{d.noPct}% <span className="text-slate-400 font-normal">({d.noCount})</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grouped bar chart — percentages */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">Yes vs No — Percentage Comparison</h3>
          <p className="text-xs text-slate-400 mb-4">
            Grouped bar chart showing % of Yes and No responses per sense organ.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="sense" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={(value: number) => `${value}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Yes (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="No (%)"  fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-sense pie charts */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">Symptomatic Rate per Sense</h3>
          <p className="text-xs text-slate-400 mb-3">
            Individual donut chart for each sense showing Yes/No split.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {enriched.map((d) => (
              <div key={d.sense} className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={90}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Yes', value: d.yesPct },
                        { name: 'No',  value: d.noPct  },
                      ]}
                      cx="50%" cy="50%"
                      outerRadius={38} innerRadius={20}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-[11px] font-semibold text-slate-700 mt-1">{d.sense}</p>
                <p className="text-[10px] text-emerald-600 font-bold">{d.yesPct}% Yes</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
