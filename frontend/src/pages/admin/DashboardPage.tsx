import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api';
import { motion } from 'framer-motion';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ClipboardList, Users, CheckCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardStats } from '../../types';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const stats: DashboardStats = data?.data?.data?.stats || {};
  const dailyData = data?.data?.data?.dailyData || [];
  const recentSurveys = data?.data?.data?.recentSurveys || [];

  const statCards = [
    { label: 'Total Surveys', value: stats.totalSurveys ?? 0, icon: ClipboardList, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Active Surveys', value: stats.activeSurveys ?? 0, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Participants', value: stats.totalParticipants ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Completed Responses', value: stats.completedResponses ?? 0, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completion Rate', value: `${stats.completionRate ?? 0}%`, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Avg. Completion Time', value: `${stats.avgCompletionTime ?? 0} min`, icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your research surveys</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{card.value}</p>
              </div>
              <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Responses (Last 7 Days)</h3>
          <div className="h-56 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorResponses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="responses" stroke="#0ea5e9" fill="url(#colorResponses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Surveys</h3>
          <div className="space-y-3">
            {recentSurveys.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No surveys yet</p>
            ) : (
              recentSurveys.map((survey: { id: string; title: string; status: string; _count: { responses: number } }) => (
                <div key={survey.id} className="flex flex-col gap-2 py-3 border-b border-slate-50 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 break-words sm:truncate">{survey.title}</p>
                    <p className="text-xs text-slate-400">{survey._count?.responses ?? 0} responses</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:ml-3 sm:justify-start">
                    <span className={`badge ${survey.status === 'PUBLISHED' ? 'badge-success' : survey.status === 'DRAFT' ? 'badge-warning' : 'badge-gray'}`}>
                      {survey.status}
                    </span>
                    <Link to={`/admin/surveys/${survey.id}/edit`} className="text-xs text-primary-600 hover:text-primary-700">
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link to="/admin/surveys" className="btn-secondary w-full mt-4 text-sm justify-center">
            View All Surveys
          </Link>
        </div>
      </div>
    </div>
  );
}
