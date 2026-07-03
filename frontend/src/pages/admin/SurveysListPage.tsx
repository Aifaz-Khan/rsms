import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { surveyApi, exportApi } from '../../api';
import { Survey } from '../../types';
import { Plus, Search, MoreVertical, Edit, Trash2, Copy, BarChart3, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SurveysListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['surveys', search, status],
    queryFn: () => surveyApi.getAll({ search, status, limit: 50 }),
  });

  const surveys: Survey[] = data?.data?.data || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleWindowChange = () => setOpenMenu(null);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, []);

  const toggleMenu = (surveyId: string, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();

    setOpenMenu((current) =>
      current?.id === surveyId
        ? null
        : {
            id: surveyId,
            top: rect.bottom + 8,
            right: Math.max(12, window.innerWidth - rect.right),
          },
    );
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surveyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Survey deleted');
    },
    onError: () => toast.error('Failed to delete survey'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => surveyApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Survey duplicated');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => surveyApi.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Survey published');
    },
  });

  const handleExportCSV = async (surveyId: string) => {
    try {
      const res = await exportApi.csv(surveyId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${surveyId}-responses.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PUBLISHED: 'badge-success',
      DRAFT: 'badge-warning',
      ARCHIVED: 'badge-gray',
      CLOSED: 'badge-danger',
    };
    return map[status] || 'badge-gray';
  };

  const selectedSurvey = openMenu ? surveys.find((survey) => survey.id === openMenu.id) : null;

  const renderSurveyActions = (survey: Survey) => (
    <>
      {survey.status === 'DRAFT' && (
        <button
          onClick={() => { publishMutation.mutate(survey.id); setOpenMenu(null); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Publish Survey
        </button>
      )}
      <button
        onClick={() => { duplicateMutation.mutate(survey.id); setOpenMenu(null); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <Copy className="w-3.5 h-3.5" /> Duplicate
      </button>
      <button
        onClick={() => { handleExportCSV(survey.id); setOpenMenu(null); }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <Download className="w-3.5 h-3.5" /> Export CSV
      </button>
      <hr className="my-1 border-slate-100" />
      <button
        onClick={() => {
          if (confirm('Delete this survey? This cannot be undone.')) {
            deleteMutation.mutate(survey.id);
          }
          setOpenMenu(null);
        }}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Surveys</h1>
          <p className="text-slate-500 text-sm mt-1">{surveys.length} surveys total</p>
        </div>
        <Link to="/admin/surveys/new" className="btn-primary w-full sm:w-auto">
          <Plus className="w-4 h-4" /> New Survey
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input sm:w-auto">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-4">No surveys found</p>
            <Link to="/admin/surveys/new" className="btn-primary">
              <Plus className="w-4 h-4" /> Create Your First Survey
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {surveys.map((survey) => (
                <article key={survey.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 break-words">{survey.title}</p>
                      <p className="text-xs text-slate-400 mt-1 break-all">{survey.slug}</p>
                    </div>
                    <button
                      onClick={(event) => toggleMenu(survey.id, event.currentTarget)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0"
                      aria-label={`Open actions for ${survey.title}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <span className={`badge ${statusBadge(survey.status)} mt-1`}>{survey.status}</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Responses</p>
                      <p className="mt-1 font-medium text-slate-700">{survey._count?.responses ?? 0}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400">Created</p>
                      <p className="mt-1 text-slate-700">{format(new Date(survey.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/admin/surveys/${survey.id}/edit`}
                      className="btn-secondary flex-1 px-3"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </Link>
                    <Link
                      to={`/admin/analytics/${survey.id}`}
                      className="btn-secondary px-3"
                      aria-label={`View analytics for ${survey.title}`}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Link>
                    <a
                      href={`/survey/${survey.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3"
                      aria-label={`Preview ${survey.title}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-header">Survey</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Responses</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-slate-800">{survey.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{survey.slug}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${statusBadge(survey.status)}`}>{survey.status}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium">{survey._count?.responses ?? 0}</span>
                    </td>
                    <td className="table-cell text-slate-500">
                      {format(new Date(survey.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/admin/surveys/${survey.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/admin/analytics/${survey.id}`}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          title="Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <a
                          href={`/survey/${survey.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                          title="Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

	                        <div>
	                          <button
	                            onClick={(event) => toggleMenu(survey.id, event.currentTarget)}
	                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
	                            aria-label={`Open actions for ${survey.title}`}
	                          >
	                            <MoreVertical className="w-4 h-4" />
	                          </button>
	                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
	              </table>
	            </div>
	          </>
	        )}
      </div>
      {selectedSurvey && (
        <div
          ref={menuRef}
          className="fixed w-44 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50"
          style={{ top: openMenu?.top ?? 0, right: openMenu?.right ?? 12 }}
        >
          {renderSurveyActions(selectedSurvey)}
        </div>
      )}
    </div>
  );
}
