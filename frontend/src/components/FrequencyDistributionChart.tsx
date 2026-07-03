import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Ear, Wind, Droplets, Hand, BarChart2 } from 'lucide-react';

const FREQ_COLORS: Record<string, string> = {
  Always:    '#ef4444',
  Often:     '#f97316',
  Sometimes: '#f59e0b',
  Rarely:    '#22c55e',
  Never:     '#3b82f6',
};

const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

const SENSE_META: Record<string, { icon: React.ReactNode; subtitle: string; accent: string }> = {
  Eyes: {
    icon: <Eye className="w-5 h-5" />,
    subtitle: 'Eye strain, vision & screen use',
    accent: '#0ea5e9',
  },
  Ears: {
    icon: <Ear className="w-5 h-5" />,
    subtitle: 'Hearing, ringing & noise exposure',
    accent: '#8b5cf6',
  },
  Nose: {
    icon: <Wind className="w-5 h-5" />,
    subtitle: 'Nasal blockage, smell & sneezing',
    accent: '#10b981',
  },
  Tongue: {
    icon: <Droplets className="w-5 h-5" />,
    subtitle: 'Taste, mouth dryness & oral health',
    accent: '#ec4899',
  },
  Skin: {
    icon: <Hand className="w-5 h-5" />,
    subtitle: 'Rashes, itching, dryness & hand care',
    accent: '#f59e0b',
  },
  General: {
    icon: <BarChart2 className="w-5 h-5" />,
    subtitle: 'Lifestyle & cross-sense questions',
    accent: '#64748b',
  },
};

interface SenseData {
  sense: string;
  total: number;
  distribution: { label: string; count: number }[];
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
  const bySense: SenseData[] = responseData.bySense ?? [];

  if (bySense.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 py-10">
        No frequency data found.
      </div>
    );
  }

  const totalAnswers = bySense.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-2xl">
        <h3 className="text-base font-bold text-amber-900 mb-1">
          Frequency Response Distribution — Per Sense Organ
        </h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          Each chart shows how participants answered frequency questions
          (Always / Often / Sometimes / Rarely / Never) for each individual sense organ.
          Yes / No questions are excluded.
          Total responses across all senses:{' '}
          <strong>{totalAnswers.toLocaleString()}</strong>.
        </p>
      </div>

      {/* Shared legend */}
      <div className="card py-3">
        <div className="flex flex-wrap items-center gap-5 justify-center">
          {ORDER.map((label) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: FREQ_COLORS[label] }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Per-sense pie chart grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {bySense.map((item) => {
          const meta = SENSE_META[item.sense];
          const pieData = ORDER.map((label) => ({
            name: label,
            value: item.distribution.find((d) => d.label === label)?.count ?? 0,
          })).filter((d) => d.value > 0);

          return (
            <div
              key={item.sense}
              className="card flex flex-col items-center text-center hover:shadow-md transition-shadow duration-200"
            >
              {/* Sense header */}
              <div
                className="flex items-center gap-2 mb-1 px-3 py-1.5 rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: meta?.accent ?? '#64748b' }}
              >
                {meta?.icon}
                {item.sense}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-1 px-2">
                {meta?.subtitle ?? ''}
              </p>
              <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {item.total.toLocaleString()} total answers
              </span>

              {/* Donut pie */}
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={74}
                    innerRadius={38}
                    paddingAngle={3}
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

              {/* Mini breakdown bars */}
              <div className="w-full mt-2 space-y-1.5 px-3">
                {ORDER.map((label) => {
                  const count = item.distribution.find((d) => d.label === label)?.count ?? 0;
                  const pct = item.total > 0 ? Math.round((count / item.total) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-16 text-left text-slate-500 font-medium">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: FREQ_COLORS[label] }}
                        />
                      </div>
                      <span className="w-10 text-right text-slate-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
