import { cn } from '../../lib/utils';

type ProgressBarProps = {
  value: number;
  colorScheme: 'success' | 'warning' | 'danger' | 'neutral';
  label?: string;
  showValue?: boolean;
};

const fillColorClasses: Record<ProgressBarProps['colorScheme'], string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-slate-500'
};

const widthClasses: Record<number, string> = {
  0: 'w-0',
  5: 'w-[5%]',
  10: 'w-[10%]',
  15: 'w-[15%]',
  20: 'w-[20%]',
  25: 'w-[25%]',
  30: 'w-[30%]',
  35: 'w-[35%]',
  40: 'w-[40%]',
  45: 'w-[45%]',
  50: 'w-[50%]',
  55: 'w-[55%]',
  60: 'w-[60%]',
  65: 'w-[65%]',
  70: 'w-[70%]',
  75: 'w-[75%]',
  80: 'w-[80%]',
  85: 'w-[85%]',
  90: 'w-[90%]',
  95: 'w-[95%]',
  100: 'w-full'
};

const ProgressBar = ({ value, colorScheme, label, showValue = false }: ProgressBarProps): JSX.Element => {
  const clamped = Math.min(100, Math.max(0, value));
  const rounded = Math.round(clamped / 5) * 5;

  return (
    <div className="space-y-2">
      {label || showValue ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>{label}</span>
          {showValue ? <span>{Math.round(clamped)}%</span> : null}
        </div>
      ) : null}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            fillColorClasses[colorScheme],
            widthClasses[rounded]
          )}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
