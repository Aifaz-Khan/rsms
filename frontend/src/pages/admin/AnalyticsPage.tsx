import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, exportApi } from '../../api';
import { ArrowLeft, Download } from 'lucide-react';
import {
  Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
  const { surveyId } = useParams<{ surveyId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', surveyId],
    queryFn: () => analyticsApi.getSurveyAnalytics(surveyId!),
    enabled: !!surveyId,
  });

  const analytics = data?.data?.data;

  const handleExport = async (type: 'csv' | 'excel') => {
    try {
      const res = type === 'csv' ? await exportApi.csv(surveyId!) : await exportApi.excel(surveyId!);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${surveyId}-responses.${type === 'csv' ? 'csv' : 'xlsx'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">No analytics data available</p>
      </div>
    );
  }

  const { overview, questionAnalysis, sectionCompletion, responseTrend } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/surveys" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Survey Analytics</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn-secondary text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Responses', value: overview.totalResponses },
          { label: 'Completed', value: overview.completedResponses },
          { label: 'Completion Rate', value: `${overview.completionRate}%` },
          { label: 'Avg. Time', value: `${overview.avgCompletionTime} min` },
        ].map((card) => (
          <div key={card.label} className="card">
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Response trend */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Response Trend (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={responseTrend}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="responses" stroke="#0ea5e9" fill="url(#colorTrend)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Section completion */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">Section Completion Rates</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={sectionCompletion} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="sectionTitle" tick={{ fontSize: 11 }} width={120} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="completionRate" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Question analysis */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800">Question-wise Analysis</h3>
        {questionAnalysis
          .filter((q: { distribution: Record<string, number> }) => Object.keys(q.distribution).length > 0)
          .slice(0, 10)
          .map((q: { questionId: string; questionTitle: string; questionType: string; totalAnswers: number; responseRate: number; distribution: Record<string, number> }) => {
            const chartData = Object.entries(q.distribution).map(([key, count]) => ({ name: key, count }));
            return (
              <div key={q.questionId} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{q.questionTitle}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{q.totalAnswers} answers · {q.responseRate}% response rate</p>
                  </div>
                  <span className="badge badge-info text-xs">{q.questionType}</span>
                </div>
                {chartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
