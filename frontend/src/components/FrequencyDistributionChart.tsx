import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const FREQ_COLORS: Record<string, string> = {
  Always:    '#ef4444',
  Often:     '#f97316',
  Sometimes: '#f59e0b',
  Rarely:    '#22c55e',
  Never:     '#3b82f6',
};

const ORDER = ['Always', 'Often', 'Sometimes', 'Rarely', 'Never'];

const SENSE_ICONS: Record<string, string> = {
  Eyes:    '👁️',
  Ears:    '👂',
  Nose:    '👃',
  Tongue:  '👅',
  Skin:    '🤚',
  General: '📊',
};

const SENSE_SUBTITLES: Record<string, string> = {
  Eyes:    'Questions about eye strain, vision, screen use',
  Ears:    'Questions about hearing, ringing, noise exposure',
  Nose:    'Questions about nasal blockage, smell, sneezing',
  Tongue:  'Questions about taste, mouth dryness, metallic taste',
  Skin:    'Questions about rashes, itching, dryness, hand care',
  General: 'Cross-sense & lifestyle frequency questions',
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
      <div className="card bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-5 rounded-2xl">
        <h3 className="text-base font-bold text-amber-900 mb-1">
          📊 Frequency Response Distribution — Per Sense
        </h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          Each pie chart below shows how participants answered frequency questions
          (Always / Often / Sometimes / Rarely / Never) for{' '}
          <strong>each individual sense organ</strong>. Yes / No questions are excluded.
          Total responses across all senses: <strong>{totalAnswers.toLocaleString()}</strong>.
        </p>
      </div>

      {/* Legend — shared */}
      <div className="card py-3">
        <div className="flex flex-wrap items-center gap-4 justify-center">
          {ORDER.map((label) => (
            <div key={label} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FREQ_COLORS[label] }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Grid of pie charts — one per sense */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {bySense.map((item) => {
          // Sort data in ORDER and filter zero-count entries
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
              <div className="mb-2">
                <span className="text-3xl">{SENSE_ICONS[item.sense] ?? '📌'}</span>
                <h4 className="font-bold text-slate-800 text-base mt-1">{item.sense}</h4>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5 px-2">
                  {SENSE_SUBTITLES[item.sense] ?? ''}
                </p>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 inline-block">
                  {item.total.toLocaleString()} answers
                </span>
              </div>

              {/* Pie chart */}
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="48%"
                    outerRadius={78}
                    innerRadius={40}
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
              <div className="w-full mt-3 space-y-1.5 px-2">
                {ORDER.map((label) => {
                  const count = item.distribution.find((d) => d.label === label)?.count ?? 0;
                  const pct = item.total > 0 ? Math.round((count / item.total) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-16 text-left text-slate-500 font-medium">{label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
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
