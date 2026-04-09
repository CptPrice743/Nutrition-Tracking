import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

import Skeleton from '../ui/Skeleton';

export type WaterRingProps = {
  litres: number | null;
  target?: number;
  isLoading?: boolean;
};

const WaterRing = ({ litres, target = 3, isLoading = false }: WaterRingProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-28 mb-3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const numericLitres = litres === null ? 0 : Math.max(0, Number(litres));
  const progress = target > 0 ? Math.min(100, (numericLitres / target) * 100) : 0;

  const data = [{ name: 'water', value: progress, fill: '#2563eb' }];

  return (
    <div className="card">
      <span className="title" style={{ display: 'block', marginBottom: 16 }}>Hydration</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Ring */}
        <div style={{ width: 96, height: 96, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              barSize={10}
              data={[{ value: 100, fill: 'var(--surface-container-low)' }, ...data]}
            >
              <RadialBar dataKey="value" cornerRadius={5} background={false} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Text */}
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {litres !== null ? numericLitres.toFixed(1) : '--'}
          </div>
          <div className="overline" style={{ marginBottom: 8 }}>Liters</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Daily Goal <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{target.toFixed(1)}L</span>
          </div>
          <div className="progress-track" style={{ height: 4, width: 80 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterRing;
