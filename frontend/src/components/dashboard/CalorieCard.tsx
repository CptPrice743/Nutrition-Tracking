import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export type CalorieCardProps = {
  consumed: number | null;
  target?: number;
  isLoading?: boolean;
};

const RING_RADIUS = 34;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CalorieCard = ({ consumed, target = 2000, isLoading = false }: CalorieCardProps): JSX.Element => {
  if (isLoading) {
    return (
      <Card title="Calories Today">
        <div className="space-y-3">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-4 w-36" />
        </div>
      </Card>
    );
  }

  const numericConsumed = consumed === null ? null : Math.max(0, Number(consumed));
  const progress = numericConsumed === null ? 0 : Math.min(100, (numericConsumed / target) * 100);
  const dashLength = (progress / 100) * RING_CIRCUMFERENCE;

  return (
    <Card title="Calories Today">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
            <circle
              cx="42"
              cy="42"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="8"
              className="stroke-slate-200"
            />
            <circle
              cx="42"
              cy="42"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dashLength} ${RING_CIRCUMFERENCE}`}
              className={numericConsumed !== null && numericConsumed > target ? 'stroke-danger' : 'stroke-accent-600'}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">
            {numericConsumed === null ? '--' : `${Math.round(progress)}%`}
          </div>
        </div>

        <div>
          <p className="text-xl font-semibold text-slate-900">
            {numericConsumed === null ? '--' : `${numericConsumed.toFixed(0)} kcal`}
          </p>
          <p className="text-sm text-slate-500">Target: {target} kcal</p>
        </div>
      </div>
    </Card>
  );
};

export default CalorieCard;
