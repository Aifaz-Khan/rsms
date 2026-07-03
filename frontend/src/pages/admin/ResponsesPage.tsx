import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { responseApi } from '../../api';
import { Response } from '../../types';
import { Search, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ResponsesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['responses', page, status],
    queryFn: () => responseApi.getAll({ page, limit: 20, status }),
  });

  const responses: Response[] = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => responseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      toast.success('Response deleted');
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      COMPLETED: 'badge-success',
      IN_PROGRESS: 'badge-warning',
      ABANDONED: 'badge-gray',
    };
    return map[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Responses</h1>
        <p className="text-slate-500 text-sm mt-1">{pagination?.total ?? 0} total responses</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search responses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto">
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ABANDONED">Abandoned</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : responses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">No responses found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="table-header">Survey</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Answers</th>
                    <th className="table-header">Started</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {responses.map((response) => (
                    <tr key={response.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-slate-800 text-sm">{response.survey?.title}</p>
                      </td>
                      <td className="table-cell text-slate-500">
                        {response.participantToken?.email || <span className="text-slate-300">Anonymous</span>}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusBadge(response.status)}`}>{response.status}</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{response._count?.answers ?? 0}</span>
                      </td>
                      <td className="table-cell text-slate-500">
                        {format(new Date(response.startedAt), 'MMM d, yyyy HH:mm')}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/admin/responses/${response.id}`}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm('Delete this response?')) deleteMutation.mutate(response.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="btn-secondary text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
