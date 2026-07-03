import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { surveyApi, sectionApi, questionApi } from '../../api';
import { Survey, Section, Question, QuestionType } from '../../types';
import toast from 'react-hot-toast';
import { Plus, Save, ChevronDown, ChevronUp, Trash2, GripVertical, Settings, Eye } from 'lucide-react';
import { clsx } from 'clsx';

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'LONG_TEXT', label: 'Long Text' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'TIME', label: 'Time' },
  { value: 'RADIO', label: 'Radio Button' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'MULTIPLE_SELECT', label: 'Multiple Select' },
  { value: 'RATING', label: 'Rating' },
  { value: 'LIKERT_SCALE', label: 'Likert Scale' },
  { value: 'YES_NO', label: 'Yes / No' },
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'SLIDER', label: 'Slider' },
  { value: 'IMAGE_CHOICE', label: 'Image Choice' },
];

export default function SurveyBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [activeTab, setActiveTab] = useState<'settings' | 'builder'>('settings');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [addingQuestion, setAddingQuestion] = useState<string | null>(null);
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('SHORT_TEXT');

  const { data: surveyData } = useQuery({
    queryKey: ['survey', id],
    queryFn: () => surveyApi.getById(id!),
    enabled: isEditing,
  });

  const survey: Survey | undefined = surveyData?.data?.data;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
      isPublic: true,
      allowAnonymous: true,
    },
  });

  useEffect(() => {
    if (survey) {
      reset({
        title: survey.title,
        description: survey.description || '',
        status: survey.status,
        startDate: survey.startDate ? survey.startDate.slice(0, 10) : '',
        endDate: survey.endDate ? survey.endDate.slice(0, 10) : '',
        isPublic: survey.isPublic,
        allowAnonymous: survey.allowAnonymous,
      });
    }
  }, [survey, reset]);

  const saveSurveyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEditing ? surveyApi.update(id!, data) : surveyApi.create(data),
    onSuccess: (res) => {
      toast.success(isEditing ? 'Survey updated' : 'Survey created');
      queryClient.invalidateQueries({ queryKey: ['surveys'] });
      if (!isEditing) {
        navigate(`/admin/surveys/${res.data.data.id}/edit`);
      }
    },
    onError: () => toast.error('Failed to save survey'),
  });

  const addSectionMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      sectionApi.create(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      toast.success('Section added');
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => sectionApi.delete(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      toast.success('Section deleted');
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: Record<string, unknown> }) =>
      questionApi.create(sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      setAddingQuestion(null);
      toast.success('Question added');
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => questionApi.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', id] });
      toast.success('Question deleted');
    },
  });

  const onSubmit = (data: Record<string, unknown>) => {
    saveSurveyMutation.mutate(data);
  };

  const handleAddSection = () => {
    const title = prompt('Section title:');
    if (title) addSectionMutation.mutate({ title });
  };

  const handleAddQuestion = (sectionId: string) => {
    addQuestionMutation.mutate({
      sectionId,
      data: {
        type: newQuestionType,
        title: 'New Question',
        isRequired: false,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Survey' : 'Create Survey'}
          </h1>
          {survey && <p className="text-slate-500 text-sm mt-1">{survey.slug}</p>}
        </div>
        {isEditing && (
          <a
            href={`/survey/${survey?.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            <Eye className="w-4 h-4" /> Preview
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['settings', 'builder'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize',
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'settings' ? 'Survey Settings' : 'Section & Questions'}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl space-y-4">
          <div>
            <label className="label">Survey Title *</label>
            <input {...register('title', { required: 'Title is required' })} className="input" placeholder="Enter survey title" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Survey description" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input {...register('startDate')} type="date" className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">End Date</label>
              <input {...register('endDate')} type="date" className="input" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('isPublic')} type="checkbox" className="rounded text-primary-600" />
              <span className="text-sm text-slate-700">Public Survey</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('allowAnonymous')} type="checkbox" className="rounded text-primary-600" />
              <span className="text-sm text-slate-700">Allow Anonymous</span>
            </label>
          </div>

          <button type="submit" disabled={saveSurveyMutation.isPending} className="btn-primary">
            <Save className="w-4 h-4" />
            {saveSurveyMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Survey'}
          </button>
        </form>
      )}

      {activeTab === 'builder' && (
        <div className="space-y-4">
          {!isEditing ? (
            <div className="card text-center py-8">
              <p className="text-slate-500 mb-4">Save survey settings first to add sections and questions.</p>
            </div>
          ) : (
            <>
              {survey?.sections?.map((section: Section) => (
                <div key={section.id} className="card p-0 overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{section.title}</p>
                      <p className="text-xs text-slate-400">{section.questions?.length ?? 0} questions</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
                      >
                        {expandedSection === section.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this section?')) deleteSectionMutation.mutate(section.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Questions */}
                  {expandedSection === section.id && (
                    <div className="p-4 space-y-3">
                      {section.questions?.map((question: Question) => (
                        <div key={question.id} className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors">
                          <GripVertical className="w-4 h-4 text-slate-300 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{question.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{question.type}</span>
                              {question.isRequired && <span className="text-xs text-red-500">Required</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this question?')) deleteQuestionMutation.mutate(question.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add question */}
                      {addingQuestion === section.id ? (
                        <div className="flex items-center gap-2 p-3 border border-dashed border-primary-200 rounded-lg bg-primary-50">
                          <select
                            value={newQuestionType}
                            onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                            className="input text-sm flex-1"
                          >
                            {QUESTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddQuestion(section.id)}
                            disabled={addQuestionMutation.isPending}
                            className="btn-primary text-sm"
                          >
                            Add
                          </button>
                          <button onClick={() => setAddingQuestion(null)} className="btn-secondary text-sm">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingQuestion(section.id)}
                          className="flex items-center gap-2 w-full p-3 border border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" /> Add Question
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button onClick={handleAddSection} className="btn-secondary w-full">
                <Plus className="w-4 h-4" /> Add Section
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
