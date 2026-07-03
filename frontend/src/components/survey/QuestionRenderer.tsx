import { Question, QuestionOption } from '../../types';
import { clsx } from 'clsx';
import { HelpCircle } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export default function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const renderInput = () => {
    switch (question.type) {
      case 'SHORT_TEXT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <input
            type={question.type === 'EMAIL' ? 'email' : question.type === 'PHONE' ? 'tel' : 'text'}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className={clsx('input', error && 'border-red-300 focus:ring-red-500')}
          />
        );

      case 'LONG_TEXT':
        return (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className={clsx('input resize-none', error && 'border-red-300 focus:ring-red-500')}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={question.placeholder}
            min={question.validation?.min}
            max={question.validation?.max}
            className={clsx('input', error && 'border-red-300 focus:ring-red-500')}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={clsx('input', error && 'border-red-300 focus:ring-red-500')}
          />
        );

      case 'TIME':
        return (
          <input
            type="time"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={clsx('input', error && 'border-red-300 focus:ring-red-500')}
          />
        );

      case 'RADIO':
      case 'YES_NO': {
        const radioOptions = question.type === 'YES_NO'
          ? [{ id: 'yes', value: 'yes', label: 'Yes' }, { id: 'no', value: 'no', label: 'No' }]
          : (question.options || []);

        return (
          <div className="space-y-2">
            {radioOptions.map((opt: QuestionOption | { id: string; value: string; label: string }) => (
              <label
                key={opt.value}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  value === opt.value
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'CHECKBOX':
      case 'MULTIPLE_SELECT': {
        const selected = Array.isArray(value) ? value as string[] : [];
        return (
          <div className="space-y-2">
            {question.options?.map((opt: QuestionOption) => (
              <label
                key={opt.value}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selected.includes(opt.value)
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={selected.includes(opt.value)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, opt.value]);
                    else onChange(selected.filter((v) => v !== opt.value));
                  }}
                  className="text-primary-600 focus:ring-primary-500 rounded"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'DROPDOWN':
        return (
          <select
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={clsx('input', error && 'border-red-300 focus:ring-red-500')}
          >
            <option value="">Select an option...</option>
            {question.options?.map((opt: QuestionOption) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'RATING': {
        const maxRating = question.settings?.maxRating || 5;
        return (
          <div className="flex items-center gap-2">
            {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                className={clsx(
                  'w-10 h-10 rounded-lg border-2 text-sm font-semibold transition-colors',
                  Number(value) >= star
                    ? 'border-amber-400 bg-amber-400 text-white'
                    : 'border-slate-200 text-slate-400 hover:border-amber-300'
                )}
              >
                {star}
              </button>
            ))}
          </div>
        );
      }

      case 'LIKERT_SCALE': {
        const scale = question.settings?.scale || 5;
        const labels = question.settings?.labels || [];
        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={clsx(
                    'w-12 h-12 rounded-lg border-2 text-sm font-semibold transition-colors',
                    Number(value) === n
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary-300'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {labels.length > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-400">{labels[0]}</span>
                <span className="text-xs text-slate-400">{labels[labels.length - 1]}</span>
              </div>
            )}
          </div>
        );
      }

      case 'SLIDER': {
        const min = question.settings?.minValue ?? 0;
        const max = question.settings?.maxValue ?? 100;
        const step = question.settings?.step ?? 1;
        return (
          <div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={Number(value ?? min)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full accent-primary-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{min}</span>
              <span className="font-medium text-primary-600">{String(value ?? min)}</span>
              <span>{max}</span>
            </div>
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            className="input"
          />
        );
    }
  };

  return (
    <div className={clsx('card', error && 'border-red-200')}>
      <div className="mb-3">
        <div className="flex items-start gap-2">
          <label className="text-sm font-medium text-slate-800 leading-relaxed">
            {question.title}
            {question.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          {question.tooltip && (
            <div className="group relative flex-shrink-0 mt-0.5">
              <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-6 top-0 w-48 bg-slate-800 text-white text-xs rounded-lg p-2 hidden group-hover:block z-10">
                {question.tooltip}
              </div>
            </div>
          )}
        </div>
        {question.description && (
          <p className="text-xs text-slate-500 mt-0.5">{question.description}</p>
        )}
      </div>

      {renderInput()}

      {question.helpText && !error && (
        <p className="text-xs text-slate-400 mt-1.5">{question.helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
