// PrimaryScreeningChart.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

/**
 * Fetches aggregated Yes/No counts for primary‑screening questions per sense
 * and renders a grouped bar chart.
 */
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
    return <div className="text-center text-sm text-red-600">Failed to load primary scores.</div>;
  }

  const chartData = data?.map((d: any) => ({
    sense: d.sense,
    Yes: d.yesCount,
    No: d.noCount,
  })) || [];

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-4">Primary Screening Scores (Yes / No)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="sense" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `${value}`} />
          <Legend />
          <Bar dataKey="Yes" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="No" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
