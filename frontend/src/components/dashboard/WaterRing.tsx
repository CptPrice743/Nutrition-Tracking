import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export type WaterRingProps = {
  litres: number | null;
  target?: number;
  isLoading?: boolean;
};

const RING_RADIUS = 32;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const WaterRing = ({ litres, target = 3, isLoading = false }: WaterRingProps): JSX.Element => {
  if (isLoading) {
    return (
      <Card title="Water Intake">
        <Skeleton className="h-24 w-24 rounded-full" />
      </Card>
    );
  }

  const numericLitres = litres === null ? null : Math.max(0, Number(litres));
  const progress = numericLitres === null ? 0 : Math.min(100, (numericLitres / target) * 100);
  const dashLength = (progress / 100) * RING_CIRCUMFERENCE;

  return (
    <Card title="Water Intake">
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
              className="stroke-cyan-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">
            {numericLitres === null ? '--' : `${Math.round(progress)}%`}
          </div>
        </div>

        <div>
          <p className="text-xl font-semibold text-slate-900">
            {numericLitres === null ? '--' : `${numericLitres.toFixed(1)} L`}
          </p>
          <p className="text-sm text-slate-500">Target: {target.toFixed(1)} L</p>
        </div>
      </div>
    </Card>
  );
};

export default WaterRing;
