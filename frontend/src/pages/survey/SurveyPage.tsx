import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyApi, responseApi } from '../../api';
import { Survey, Section, Question, SurveyLogic } from '../../types';
import QuestionRenderer from '../../components/survey/QuestionRenderer';
import SurveyProgressBar from '../../components/survey/SurveyProgressBar';
import toast from 'react-hot-toast';
import { Activity, ChevronLeft, ChevronRight, Save } from 'lucide-react';

export default function SurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [responseId, setResponseId] = useState<string | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionHistory, setSectionHistory] = useState<number[]>([0]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: surveyData, isLoading, error } = useQuery({
    queryKey: ['survey', slug],
    queryFn: () => surveyApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const survey: Survey | undefined = surveyData?.data?.data;
  const sections = survey?.sections || [];
  const currentSection: Section | undefined = sections[currentSectionIndex];

  // Initialize participant token and response
  useEffect(() => {
    if (!survey) return;

    const initSurvey = async () => {
      try {
        let token = localStorage.getItem(`participant_token_${survey.id}`);

        if (!token) {
          const tokenRes = await responseApi.getToken(survey.id);
          token = tokenRes.data.data.token;
          localStorage.setItem(`participant_token_${survey.id}`, token!);
        }

        // Set token in axios header via localStorage (handled by interceptor)
        localStorage.setItem('participantToken', token!);

        const startRes = await responseApi.start(survey.id);
        const response = startRes.data.data;
        setResponseId(response.id);

        // Restore answers
        if (response.answers && response.answers.length > 0) {
          const restored: Record<string, unknown> = {};
          response.answers.forEach((a: { questionId: string; value: unknown }) => {
            restored[a.questionId] = a.value;
          });
          setAnswers(restored);
        }

        // Restore section
        if (response.currentSectionId) {
          const sectionIdx = sections.findIndex((s) => s.id === response.currentSectionId);
          if (sectionIdx >= 0) {
            setCurrentSectionIndex(sectionIdx);
            setSectionHistory([sectionIdx]);
          }
        }
      } catch (err) {
        console.error('Failed to initialize survey:', err);
      }
    };

    initSurvey();
  }, [survey?.id]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (!responseId) return;

    autoSaveRef.current = setInterval(() => {
      saveAnswers(false);
    }, 10000);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [responseId, answers, currentSection]);

  const saveAnswers = useCallback(async (showToast = true) => {
    if (!responseId || !currentSection) return;

    setIsSaving(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      await responseApi.save({
        responseId,
        answers: answersArray,
        currentSectionId: currentSection.id,
        currentQuestionOrder: 0,
      });
      setLastSaved(new Date());
      if (showToast) toast.success('Progress saved');
    } catch {
      if (showToast) toast.error('Failed to save progress');
    } finally {
      setIsSaving(false);
    }
  }, [responseId, answers, currentSection]);

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
    }
  };

  const isQuestionVisible = (question: Question): boolean => {
    // 1. "Are you? (For Non-teaching staff)" depends on "Are you.." being "non_teaching_staff"
    if (question.title.startsWith('Are you? (For Non-teaching')) {
      const roleQuestion = currentSection?.questions?.find(q => q.title.startsWith('Are you..'));
      if (roleQuestion) {
        return answers[roleQuestion.id] === 'non_teaching_staff';
      }
    }
    // 2. "If yes, please specify" depends on the preceding chronic illness/taste/skin question being "yes"
    if (question.title.toLowerCase().startsWith('if yes, please specify') || question.title.toLowerCase().startsWith('if yes, then')) {
      const prevQuestion = currentSection?.questions?.find(q => 
        q.title.toLowerCase().includes('chronic') || q.title.toLowerCase().includes('difficulty') || q.title.toLowerCase().includes('disorder')
      );
      if (prevQuestion) {
        return answers[prevQuestion.id] === 'yes';
      }
    }
    return true;
  };

  const validateSection = (): boolean => {
    if (!currentSection) return true;
    const newErrors: Record<string, string> = {};

    currentSection.questions?.forEach((q: Question) => {
      if (q.isRequired && isQuestionVisible(q)) {
        const val = answers[q.id];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          newErrors[q.id] = 'This field is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Apply survey logic to determine next section
  const getNextSectionIndex = (): number => {
    if (!survey?.surveyLogic || !currentSection) return currentSectionIndex + 1;

    // Filter logic rules to only those where the condition question belongs to the current section
    const currentQuestionIds = currentSection.questions?.map((q) => q.id) || [];
    const relevantLogic = (survey.surveyLogic as SurveyLogic[]).filter((logic) =>
      currentQuestionIds.includes(logic.conditionQuestionId)
    );

    for (const logic of relevantLogic) {
      const answer = answers[logic.conditionQuestionId];
      let conditionMet = false;

      switch (logic.operator) {
        case 'EQUALS': conditionMet = String(answer) === logic.conditionValue; break;
        case 'NOT_EQUALS': conditionMet = String(answer) !== logic.conditionValue; break;
        case 'CONTAINS': conditionMet = String(answer).includes(logic.conditionValue); break;
        case 'IS_EMPTY': conditionMet = !answer || answer === ''; break;
        case 'IS_NOT_EMPTY': conditionMet = !!answer && answer !== ''; break;
        default: break;
      }

      if (conditionMet && logic.action === 'JUMP_TO_SECTION' && logic.targetSectionId) {
        const targetIdx = sections.findIndex((s) => s.id === logic.targetSectionId);
        if (targetIdx >= 0) return targetIdx;
      }
    }

    return currentSectionIndex + 1;
  };

  const handleNext = async () => {
    if (!validateSection()) {
      toast.error('Please answer all required questions');
      return;
    }

    await saveAnswers(false);

    const nextIdx = getNextSectionIndex();
    if (nextIdx >= sections.length) {
      await handleSubmit();
    } else {
      setSectionHistory((prev) => [...prev, nextIdx]);
      setCurrentSectionIndex(nextIdx);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = async () => {
    await saveAnswers(false);
    setSectionHistory((prev) => {
      if (prev.length <= 1) {
        setCurrentSectionIndex(0);
        return [0];
      }
      const newHistory = prev.slice(0, -1);
      const prevIdx = newHistory[newHistory.length - 1];
      setCurrentSectionIndex(prevIdx);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return newHistory;
    });
  };

  const handleSubmit = async () => {
    if (!validateSection()) {
      toast.error('Please answer all required questions');
      return;
    }

    setIsSubmitting(true);
    try {
      const answersArray = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
      await responseApi.submit({ responseId: responseId!, answers: answersArray });
      navigate(`/survey/${slug}/complete`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to submit survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleQuestionsInCurrentSection = currentSection?.questions?.filter(isQuestionVisible) || [];
  const currentSectionQuestionsTotal = visibleQuestionsInCurrentSection.length;
  const currentSectionQuestionsAnswered = visibleQuestionsInCurrentSection.filter((q) => {
    const val = answers[q.id];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  }).length;
  const currentStep = sectionHistory.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-medical-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen bg-medical-bg flex items-center justify-center p-4">
        <div className="card text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Survey Not Found</h2>
          <p className="text-slate-500 text-sm">This survey may have expired or is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medical-bg">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-slate-800 truncate">{survey.title}</h1>
              {currentSection && (
                <p className="text-xs text-slate-500">Section {currentSectionIndex + 1} of {sections.length}: {currentSection.title}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              {isSaving ? (
                <><span className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : lastSaved ? (
                <><Save className="w-3 h-3" /> Saved</>
              ) : null}
            </div>
          </div>
          <SurveyProgressBar
            currentSectionTitle={currentSection?.title || ''}
            answered={currentSectionQuestionsAnswered}
            total={currentSectionQuestionsTotal}
            currentStep={currentStep}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {currentSection && (
            <motion.div
              key={currentSection.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Section header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">{currentSection.title}</h2>
                {currentSection.description && (
                  <p className="text-slate-500 text-sm mt-1 mb-2">{currentSection.description}</p>
                )}
                
                {currentSection.title.toLowerCase().match(/detailed|professional|manas/) && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-600 space-y-2 shadow-sm mt-3">
                    <p className="font-semibold text-slate-800 text-sm border-b border-slate-200/60 pb-1.5">Response Frequency Guide:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      <div><span className="font-semibold text-slate-800">Never:</span> Did not experience the symptom or exposure at all during the past 6 months.</div>
                      <div><span className="font-semibold text-slate-800">Rarely:</span> Experienced it 6–12 times during the past 6 months.</div>
                      <div><span className="font-semibold text-slate-800">Sometimes:</span> Experienced it about once a week (3–4 times in a month).</div>
                      <div><span className="font-semibold text-slate-800">Often:</span> Experienced it 2–6 times per week.</div>
                      <div className="md:col-span-2"><span className="font-semibold text-slate-800">Always:</span> Experienced it every day or almost every day.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {currentSection.questions?.filter(isQuestionVisible).map((question: Question, idx: number) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <QuestionRenderer
                      question={question}
                      value={answers[question.id]}
                      onChange={(val) => handleAnswer(question.id, val)}
                      error={errors[question.id]}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={handlePrev}
                  disabled={sectionHistory.length <= 1}
                  className="btn-secondary disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <button
                  onClick={() => saveAnswers(true)}
                  className="btn-secondary text-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Progress
                </button>

                {currentSectionIndex < sections.length - 1 ? (
                  <button onClick={handleNext} className="btn-primary">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={isSubmitting} className="btn-success">
                    {isSubmitting ? 'Submitting...' : 'Submit Survey'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
