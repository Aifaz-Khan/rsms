import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { responseApi } from '../../api';
import { Response, Answer } from '../../types';
import { ArrowLeft, User, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['response', id],
    queryFn: () => responseApi.getById(id!),
    enabled: !!id,
  });

  const response: Response | undefined = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">Response not found</p>
        <Link to="/admin/responses" className="btn-secondary mt-4">Back to Responses</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link to="/admin/responses" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Response Detail</h1>
          <p className="text-slate-500 text-sm mt-1">{response.survey?.title}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Participant</span>
          </div>
          <p className="text-sm font-medium text-slate-800">
            {response.participantToken?.email || 'Anonymous'}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Started</span>
          </div>
          <p className="text-sm font-medium text-slate-800">
            {format(new Date(response.startedAt), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500">Status</span>
          </div>
          <span className={`badge ${response.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
            {response.status}
          </span>
        </div>
      </div>

      {/* Answers */}
      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Answers ({response.answers?.length ?? 0})</h2>
        <div className="space-y-4">
          {response.answers?.map((answer: Answer) => (
            <div key={answer.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <p className="text-xs text-slate-500 mb-1">{answer.question?.title}</p>
              <p className="text-sm text-slate-800 font-medium">
                {Array.isArray(answer.value)
                  ? (answer.value as string[]).join(', ')
                  : String(answer.value ?? '—')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
