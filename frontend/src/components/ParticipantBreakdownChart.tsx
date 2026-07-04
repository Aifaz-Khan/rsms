import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, GraduationCap, BookOpen, Briefcase, UserCheck } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  Student:       '#0ea5e9',
  'Teaching Staff': '#8b5cf6',
  Intern:        '#f59e0b',
  Receptionist:  '#10b981',
  Nurse:         '#ec4899',
  Cleaner:       '#64748b',
  Watchmen:      '#f97316',
  Driver:        '#14b8a6',
  Gardener:      '#84cc16',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Student:          <BookOpen className="w-4 h-4" />,
  'Teaching Staff': <GraduationCap className="w-4 h-4" />,
  Intern:           <UserCheck className="w-4 h-4" />,
};

// Group types into categories for display
const CATEGORY_GROUPS: Record<string, string[]> = {
  'Academic':      ['Student', 'Teaching Staff', 'Intern'],
  'Non-Teaching Staff': ['Receptionist', 'Nurse', 'Cleaner', 'Watchmen', 'Driver', 'Gardener'],
};

interface ParticipantEntry {
  type: string;
  count: number;
  percent: number;
}

export default function ParticipantBreakdownChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['participantBreakdown'],
    queryFn: analyticsApi.getParticipantBreakdown,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-sm text-red-600 py-10">Failed to load participant data.</div>;
  }

  const resp = data?.data?.data ?? data?.data ?? {};
  const breakdown: ParticipantEntry[] = resp.breakdown ?? [];
  const total: number = resp.total ?? 0;

  const barData = breakdown.map((d) => ({ name: d.type, Responses: d.count }));
  const pieData = breakdown.map((d) => ({ name: d.type, value: d.count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 p-5 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <h3 className="text-base font-bold text-blue-900">Participant Breakdown by Type</h3>
        </div>
        <p className="text-xs text-blue-700 leading-relaxed">
          Total number of survey responses categorised by participant type —
          students, teaching staff, interns and non-teaching staff roles.
          All values are drawn directly from the <strong>{total} survey responses</strong> in the database.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {breakdown.map((d) => (
          <div
            key={d.type}
            className="card flex flex-col items-center text-center py-5 hover:shadow-md transition-shadow duration-200"
            style={{ borderTop: `3px solid ${TYPE_COLORS[d.type] ?? '#94a3b8'}` }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
              style={{ backgroundColor: `${TYPE_COLORS[d.type] ?? '#94a3b8'}20`, color: TYPE_COLORS[d.type] ?? '#94a3b8' }}
            >
              {TYPE_ICONS[d.type] ?? <Briefcase className="w-4 h-4" />}
            </div>
            <p className="text-2xl font-bold text-slate-900">{d.count}</p>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">{d.type}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{d.percent}% of total</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">Response Count by Participant Type</h3>
          <p className="text-xs text-slate-400 mb-4">
            Horizontal bar chart showing exact number of responses per participant category.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip formatter={(v: number) => [`${v} responses`, 'Count']} />
              <Bar dataKey="Responses" radius={[0, 4, 4, 0]}>
                {barData.map((entry) => (
                  <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 text-sm mb-1">Proportional Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">
            Pie chart showing each participant type as a percentage of total responses.
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                outerRadius={95}
                innerRadius={48}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} responses`, '']} />
              <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category group table */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Grouped Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.entries(CATEGORY_GROUPS).map(([group, types]) => {
            const groupItems = breakdown.filter((d) => types.includes(d.type));
            const groupTotal = groupItems.reduce((s, d) => s + d.count, 0);
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{group}</p>
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                    {groupTotal} total
                  </span>
                </div>
                <div className="space-y-2">
                  {groupItems.map((d) => (
                    <div key={d.type} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TYPE_COLORS[d.type] ?? '#94a3b8' }}
                      />
                      <span className="text-sm text-slate-700 flex-1">{d.type}</span>
                      <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${groupTotal > 0 ? Math.round((d.count / groupTotal) * 100) : 0}%`,
                            backgroundColor: TYPE_COLORS[d.type] ?? '#94a3b8',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
