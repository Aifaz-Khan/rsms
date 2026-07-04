import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, exportApi } from '../../api';
import { ArrowLeft, Download, ShieldAlert, Award, FileText, ClipboardList, Users } from 'lucide-react';
import {
  Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import PrimaryScreeningChart from '../../components/PrimaryScreeningChart';
import FrequencyDistributionChart from '../../components/FrequencyDistributionChart';
import ParticipantBreakdownChart from '../../components/ParticipantBreakdownChart';
const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [activeView, setActiveView] = useState<'summary' | 'camp' | 'primary' | 'frequency' | 'participants'>('summary');

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

  // --- Dynamic Medical Camp Insights Calculations ---
  // Finds a question by keyword match and returns % of 'yes' answers — fully data-driven, no hardcoded fallbacks
  const getComplaintRate = (titleKeywords: string[]) => {
    const q = questionAnalysis?.find((qa: any) =>
      titleKeywords.every(k => qa.questionTitle.toLowerCase().includes(k.toLowerCase()))
    );
    if (!q) return 0;
    const total = q.totalAnswers || 1;
    const yesCount = q.distribution?.yes || q.distribution?.Yes || 0;
    return Math.round((yesCount / total) * 100);
  };

  // Real keyword matches from actual survey question titles in the database
  const eyeRate = getComplaintRate(['eye-related complaints']);
  const noseRate = Math.max(
    getComplaintRate(['nasal blockage or obstruction']),
    getComplaintRate(['reduction or loss', 'smell']),
    getComplaintRate(['nasal dryness'])
  );
  const tongueRate = getComplaintRate(['difficulty identifying', 'six tastes']);
  const skinRate = getComplaintRate(['chronic skin disorders']);
  const earRate = getComplaintRate(['ear related complaint']);

  const radarData = [
    { subject: 'Eyes (Chakshu)', A: eyeRate, fullMark: 100 },
    { subject: 'Nose (Ghrana)', A: noseRate, fullMark: 100 },
    { subject: 'Tongue (Rasana)', A: tongueRate, fullMark: 100 },
    { subject: 'Skin (Sparsha)', A: skinRate, fullMark: 100 },
    { subject: 'Ears (Karna)', A: earRate, fullMark: 100 },
  ];

  // Calculate Symptom Severity Breakdown from real frequency-type answers only
  let alwaysOftenCount = 0;
  let sometimesCount = 0;
  let neverRarelyCount = 0;
  let totalScaleAnswers = 0;

  questionAnalysis?.forEach((q: any) => {
    const distKeys = Object.keys(q.distribution || {});
    const isLikert = distKeys.some(k => ['always', 'often', 'sometimes', 'rarely', 'never'].includes(k.toLowerCase()));
    if (isLikert) {
      Object.entries(q.distribution).forEach(([key, val]) => {
        const k = key.toLowerCase();
        const count = Number(val) || 0;
        totalScaleAnswers += count;
        if (k === 'always' || k === 'often') alwaysOftenCount += count;
        else if (k === 'sometimes') sometimesCount += count;
        else if (k === 'never' || k === 'rarely') neverRarelyCount += count;
      });
    }
  });

  // Only render if we have real data — no hardcoded fallbacks
  const severityData = totalScaleAnswers > 0 ? [
    { name: 'Severe (Always/Often)', value: alwaysOftenCount, color: '#ef4444' },
    { name: 'Moderate (Sometimes)', value: sometimesCount, color: '#f59e0b' },
    { name: 'Mild/None (Never/Rarely)', value: neverRarelyCount, color: '#10b981' },
  ] : [];

  // Camp Capacity Allocation — proportional to real complaint rates from data
  const sumRates = eyeRate + noseRate + tongueRate + skinRate + earRate || 1;
  const campAllocationData = [
    { name: 'Netra Tarpana (Eye station)', value: Math.round((eyeRate / sumRates) * 100), color: '#0ea5e9' },
    { name: 'Nasya Therapy (Nasal station)', value: Math.round((noseRate / sumRates) * 100), color: '#8b5cf6' },
    { name: 'Kavala/Gandoosha (Oral station)', value: Math.round((tongueRate / sumRates) * 100), color: '#ec4899' },
    { name: 'Twachya Lepa (Skin station)', value: Math.round((skinRate / sumRates) * 100), color: '#10b981' },
    { name: 'Karna Purana (Ear station)', value: Math.round((earRate / sumRates) * 100), color: '#f59e0b' },
  ];

  // --- Age distribution from real data ---
  const getDistribution = (titleKeyword: string) => {
    const q = questionAnalysis?.find((qa: any) => qa.questionTitle.toLowerCase().includes(titleKeyword.toLowerCase()));
    if (!q) return [];
    const total = q.totalAnswers || 1;
    return Object.entries(q.distribution || {}).map(([key, count]) => ({
      name: key,
      count: Number(count),
      pct: Math.round((Number(count) / total) * 100),
    }));
  };

  const ageData = getDistribution('Age').sort((a, b) => a.name.localeCompare(b.name));
  const genderData = getDistribution('Gender').map(d => ({ ...d, name: d.name.charAt(0).toUpperCase() + d.name.slice(1).toLowerCase() }));

  // --- Key Risk Factor rates (% Always+Often) from frequency questions ---
  const getRiskRate = (titleKeyword: string) => {
    const q = questionAnalysis?.find((qa: any) => qa.questionTitle.toLowerCase().includes(titleKeyword.toLowerCase()));
    if (!q) return 0;
    const total = q.totalAnswers || 1;
    const high = (Number(q.distribution?.Always || q.distribution?.always || 0) + Number(q.distribution?.Often || q.distribution?.often || 0));
    return Math.round((high / total) * 100);
  };
  const getYesRate = (titleKeyword: string) => {
    const q = questionAnalysis?.find((qa: any) => qa.questionTitle.toLowerCase().includes(titleKeyword.toLowerCase()));
    if (!q) return 0;
    const total = q.totalAnswers || 1;
    return Math.round((Number(q.distribution?.yes || q.distribution?.Yes || 0) / total) * 100);
  };

  const riskFactorData = [
    { name: 'Screen time > 4h/day', value: getYesRate('4 hours per day'), color: '#0ea5e9', insight: 'Major driver of digital eye strain' },
    { name: 'Sleep < 7 hours', value: getRiskRate('less than 7'), color: '#8b5cf6', insight: 'Affects concentration & sense organ recovery' },
    { name: 'Mental stress', value: getRiskRate('mental stress'), color: '#ef4444', insight: 'Linked to sensory hypersensitivity' },
    { name: 'Physical inactivity', value: getRiskRate('physical activity'), color: '#f97316', insight: 'Reduces immune & sensory resilience' },
    { name: 'Unhealthy diet', value: getRiskRate('unhealthy or processed'), color: '#f59e0b', insight: 'Affects mucous membrane & skin health' },
    { name: 'Chronic illness', value: getYesRate('Chronic / Congenital'), color: '#10b981', insight: 'Pre-existing conditions needing priority care' },
  ].filter(d => d.value > 0);

  // --- Self-reported most affected sense (from multiple profession-specific questions) ---
  const selfReportedSense = [
    { name: 'Eyes', value: 0, color: '#0ea5e9' },
    { name: 'Ears', value: 0, color: '#8b5cf6' },
    { name: 'Nose', value: 0, color: '#10b981' },
    { name: 'Tongue', value: 0, color: '#ec4899' },
    { name: 'Skin', value: 0, color: '#f59e0b' },
  ];
  questionAnalysis?.filter((qa: any) => qa.questionTitle.toLowerCase().includes('most affected')).forEach((qa: any) => {
    Object.entries(qa.distribution || {}).forEach(([key, count]) => {
      const lower = key.toLowerCase();
      const n = Number(count);
      if (lower.includes('eye') || lower.includes('chakshu')) selfReportedSense[0].value += n;
      else if (lower.includes('ear') || lower.includes('shrotra')) selfReportedSense[1].value += n;
      else if (lower.includes('nose') || lower.includes('ghrana')) selfReportedSense[2].value += n;
      else if (lower.includes('tongue') || lower.includes('rasana')) selfReportedSense[3].value += n;
      else if (lower.includes('skin') || lower.includes('touch') || lower.includes('sparsha')) selfReportedSense[4].value += n;
    });
  });
  const selfTotal = selfReportedSense.reduce((s, d) => s + d.value, 0) || 1;

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

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('summary')}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeView === 'summary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <FileText className="w-4 h-4" /> Response Summary
        </button>
        <button
          onClick={() => setActiveView('camp')}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeView === 'camp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ClipboardList className="w-4 h-4 text-primary-600" /> Medical Camp Planning
        </button>
        <button
          onClick={() => setActiveView('primary')}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeView === 'primary' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Award className="w-4 h-4" /> Primary Screening Scores
        </button>
        <button
          onClick={() => setActiveView('frequency')}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeView === 'frequency' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500" /> Frequency Analysis
        </button>
        <button
          onClick={() => setActiveView('participants')}
          className={clsx(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
            activeView === 'participants' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Users className="w-4 h-4 text-blue-500" /> Participants
        </button>
      </div>

      {activeView === 'summary' && (
        <>
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

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Question-wise Analysis</h3>
            {questionAnalysis
              .filter((q: any) => Object.keys(q.distribution).length > 0 || (q.textResponses && q.textResponses.length > 0))
              .map((q: any) => {
                const total = q.totalAnswers || 1;
                // Convert to percentage-based chart data
                const chartData = Object.entries(q.distribution || {}).map(([key, count]) => ({
                  name: key,
                  count: Number(count),
                  pct: Math.round((Number(count) / total) * 100),
                }));
                return (
                  <div key={q.questionId} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 mr-4">
                        <p className="font-medium text-slate-800 text-sm">{q.questionTitle}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{q.totalAnswers} answers · {q.responseRate}% response rate · Section: {q.sectionTitle}</p>
                      </div>
                      <span className="badge badge-info text-xs flex-shrink-0">{q.questionType}</span>
                    </div>

                    {chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            formatter={(value: number, _name: string, props: any) =>
                              [`${props.payload.pct}% (${props.payload.count} responses)`, 'Response']
                            }
                          />
                          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {q.textResponses && q.textResponses.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Responses:</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-slate-100 rounded-lg p-3 bg-slate-50">
                          {q.textResponses.map((resp: string, idx: number) => (
                            <div key={idx} className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-100 shadow-sm break-words leading-relaxed">
                              {resp}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {activeView === 'camp' && (
        <div className="space-y-6">
          <div className="card bg-gradient-to-r from-primary-50 to-primary-100/50 border border-primary-200/60 p-5 rounded-2xl">
            <h3 className="text-base font-bold text-primary-900 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-primary-600" />
              Pre-Camp Medical Diagnostic Insights
            </h3>
            <p className="text-xs text-primary-700 leading-relaxed max-w-3xl">
              Computed directly from <strong>{overview.totalResponses} participant responses</strong>. Cross-references sensory complaints,
              demographic data, lifestyle risk factors and frequency values to help plan your 7-Day Medical Camp.
            </p>
          </div>

          {/* Row 1: Radar + Severity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">1. Sensory Organ Burden (% Affected)</h3>
              <p className="text-xs text-slate-400 mb-4">Radar chart — % of respondents with complaints per sense organ (from primary screening Yes/No questions).</p>
              <div className="flex items-center justify-center" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Complaint Rate %" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} />
                    <Tooltip formatter={(v) => `${v}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">2. Symptom Severity Breakdown</h3>
              <p className="text-xs text-slate-400 mb-4">All frequency responses classified into Severe (Always/Often), Moderate (Sometimes) and Mild/None (Rarely/Never).</p>
              <div className="flex items-center justify-center" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                      {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => {
                      const tot = severityData.reduce((s,d)=>s+d.value,0)||1;
                      return [`${value} answers (${Math.round(value/tot*100)}%)`, ''];
                    }} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 2: Age + Gender */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">3. Age Group Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Breakdown of respondents by age group — determines which age cohort needs priority camp attention.</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ageData} margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(value: number, _: any, props: any) => [`${props.payload.pct}% (${props.payload.count})`, 'Respondents']} />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {ageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">4. Gender Distribution</h3>
              <p className="text-xs text-slate-400 mb-4">Male vs Female respondent split — helps plan gender-specific Ayurvedic treatments at the camp.</p>
              <div className="flex items-center justify-center" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="45%" outerRadius={80} innerRadius={45} paddingAngle={3}
                      dataKey="pct"
                      label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}
                    >
                      {genderData.map((_, i) => <Cell key={i} fill={['#0ea5e9','#ec4899','#f59e0b'][i % 3]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, _: any, p: any) => [`${p.payload.count} (${v}%)`, '']} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Risk Factors + Self-reported sense */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">5. Key Lifestyle Risk Factors</h3>
              <p className="text-xs text-slate-400 mb-4">% of participants showing high-frequency exposure to each risk factor (Always + Often combined). Critical for camp counselling focus.</p>
              <div className="space-y-3">
                {riskFactorData.map((r) => (
                  <div key={r.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{r.name}</span>
                      <span className="text-xs font-bold" style={{ color: r.color }}>{r.value}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${r.value}%`, backgroundColor: r.color }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{r.insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">6. Self-Reported Most Affected Sense</h3>
              <p className="text-xs text-slate-400 mb-4">What participants themselves feel is their most impacted sense organ — corroborates the clinical screening data.</p>
              <div className="flex items-center justify-center" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selfReportedSense.filter(d => d.value > 0).map(d => ({ ...d, pct: Math.round(d.value/selfTotal*100) }))}
                      cx="50%" cy="45%" outerRadius={80} innerRadius={40} paddingAngle={3}
                      dataKey="value"
                      label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}
                    >
                      {selfReportedSense.filter(d=>d.value>0).map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} (${Math.round(v/selfTotal*100)}%)`, 'Respondents']} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 4: Camp Allocation + Action Plan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">7. Suggested Camp Resource Allocation</h3>
              <p className="text-xs text-slate-400 mb-4">Proportionate distribution of camp resources and specialist doctors based on detected complaint rates per sense.</p>
              <div className="flex items-center justify-center" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={campAllocationData} cx="50%" cy="45%" outerRadius={80} dataKey="value">
                      {campAllocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}% of camp capacity`} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm mb-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  8. Recommended 7-Day Camp Action Plan
                </h3>
                <p className="text-xs text-slate-400 mb-3">Targeted timeline derived from all statistical findings above.</p>
                <div className="space-y-2.5 text-xs">
                  {[
                    { days: 'Days 1–3', title: 'Netra Tarpana & Eye Care', color: 'border-blue-500', detail: `${eyeRate}% symptomatic — screen fatigue, vision tests, cooling drops` },
                    { days: 'Days 4–5', title: 'Twachya Chikitsa (Skin)', color: 'border-emerald-500', detail: `${skinRate}% chronic skin issues — lepa therapy for gardeners & cleaners` },
                    { days: 'Day 6', title: 'Nasya & Audiometry', color: 'border-purple-500', detail: `Nasal ${noseRate}% + Ear ${earRate}% — drivers & watchmen prioritized` },
                    { days: 'Day 7', title: 'Swasthavritta Counseling', color: 'border-amber-500', detail: `Lifestyle coaching — sleep, diet, stress, digital detox` },
                  ].map((item) => (
                    <div key={item.days} className={`flex items-start gap-2.5 border-l-2 ${item.color} pl-3 py-0.5`}>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{item.days}: {item.title}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Ready for project evaluation committee presentation
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeView === 'primary' && <PrimaryScreeningChart />}
      {activeView === 'frequency' && <FrequencyDistributionChart />}
      {activeView === 'participants' && <ParticipantBreakdownChart />}
    </div>
  );
}
