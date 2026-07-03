interface SurveyProgressBarProps {
  currentSectionTitle: string;
  answered: number;
  total: number;
  currentStep: number;
}

export default function SurveyProgressBar({ currentSectionTitle, answered, total, currentStep }: SurveyProgressBarProps) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
        <span className="truncate mr-4">Step {currentStep} · {currentSectionTitle}</span>
        <span className="flex-shrink-0 text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-semibold">
          {answered}/{total} Answered ({percent}%)
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
