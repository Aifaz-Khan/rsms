import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const FREQ_COLORS: Record<string, string> = {
  Always: '#ef4444',
  Often: '#f97316',
  Sometimes: '#f59e0b',
  Rarely: '#22c55e',
  Never: '#3b82f6',
};

const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

// Truncate long question titles for the bar chart Y-axis
function shortTitle(title: string, max = 52) {
  return title.length > max ? title.slice(0, max) + '…' : title;
}

export default function FrequencyDistributionChart() {
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
    return (
      <div className="text-center text-sm text-red-600 py-10">
        Failed to load frequency distribution data.
      </div>
    );
  }

  const responseData = data?.data?.data ?? data?.data ?? {};
  const overall: { label: string; count: number }[] = responseData.overall ?? [];
  const perQuestion: any[] = responseData.perQuestion ?? [];

  // Recharts pie needs { name, value }
  const pieData = ORDER.map((label) => ({
    name: label,
    value: overall.find((o) => o.label === label)?.count ?? 0,
  })).filter((d) => d.value > 0);

  // Stacked bar data — shorten titles
  const barData = perQuestion.map((q) => ({
    name: shortTitle(q.question),
    Always: q.Always ?? 0,
    Often: q.Often ?? 0,
    Sometimes: q.Sometimes ?? 0,
    Rarely: q.Rarely ?? 0,
    Never: q.Never ?? 0,
  }));

  const totalAnswers = overall.reduce((s, o) => s + o.count, 0);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5 rounded-2xl">
        <h3 className="text-base font-bold text-amber-900 mb-1">
          📊 Frequency Response Distribution
        </h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          Aggregated distribution of <strong>Always / Often / Sometimes / Rarely / Never</strong> answers
          across all common frequency questions in the survey (<strong>{totalAnswers.toLocaleString()} total answers</strong>).
          Yes / No questions are excluded.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Pie chart — overall distribution ── */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">
            Overall Frequency Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Pie chart showing combined frequency of all responses across every common question.
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={FREQ_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} answers`, '']} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Summary stats ── */}
        <div className="card flex flex-col justify-center gap-3">
          <h3 className="font-semibold text-slate-800 text-sm mb-2">Frequency Counts at a Glance</h3>
          {ORDER.map((label) => {
            const count = overall.find((o) => o.label === label)?.count ?? 0;
            const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: FREQ_COLORS[label] }}
                />
                <span className="text-sm text-slate-700 w-24 font-medium">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: FREQ_COLORS[label] }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-20 text-right">
                  {count.toLocaleString()} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stacked bar chart — per question ── */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 text-sm mb-1">
          Top 10 Questions — Frequency Breakdown
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Stacked bar chart showing how respondents answered the top 10 most answered frequency questions.
        </p>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={260}
              tick={{ fontSize: 10, fill: '#475569' }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {ORDER.map((label) => (
              <Bar key={label} dataKey={label} stackId="a" fill={FREQ_COLORS[label]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
