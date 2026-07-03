interface SurveyProgressBarProps {
  percent: number;
  answered: number;
  total: number;
  currentSection?: string;
}

export default function SurveyProgressBar({ percent, answered, total }: SurveyProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
        <span>{answered} of {total} answered</span>
        <span>{percent}% complete</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
