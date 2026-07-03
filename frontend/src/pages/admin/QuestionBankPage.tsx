import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi } from '../../api';
import { Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuestionBankPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['question-bank', search],
    queryFn: () => questionBankApi.getAll({ search }),
  });

  const questions = data?.data?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionBankApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
      toast.success('Question removed from bank');
    },
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          <p className="text-slate-500 text-sm mt-1">Reusable questions for your surveys</p>
        </div>
      </div>

      <div className="relative sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400">No questions in bank yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {questions.map((q: { id: string; title: string; type: string; category?: string; tags?: string[] }) => (
                <article key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm break-words">{q.title}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="badge badge-info">{q.type}</span>
                        <span className="text-xs text-slate-500">{q.category || 'No category'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Remove from question bank?')) deleteMutation.mutate(q.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0"
                      aria-label={`Remove ${q.title} from question bank`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {q.tags && q.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {q.tags.map((tag: string) => (
                        <span key={tag} className="badge badge-gray text-xs">{tag}</span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-header">Question</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {questions.map((q: { id: string; title: string; type: string; category?: string; tags?: string[] }) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell">
                      <p className="font-medium text-slate-800 text-sm">{q.title}</p>
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {q.tags.map((tag: string) => (
                            <span key={tag} className="badge badge-gray text-xs">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="badge badge-info">{q.type}</span>
                    </td>
                    <td className="table-cell text-slate-500">{q.category || '—'}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => {
                          if (confirm('Remove from question bank?')) deleteMutation.mutate(q.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
	              </table>
	            </div>
	          </>
	        )}
      </div>
    </div>
  );
}
