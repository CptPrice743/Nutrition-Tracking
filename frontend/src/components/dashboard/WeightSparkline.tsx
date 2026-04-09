import Skeleton from '../ui/Skeleton';

export type WeightSparklinePoint = {
  date: string;
  dayLabel: string;
  weight: number | null;
};

export type WeightSparklineProps = {
  points: WeightSparklinePoint[];
  weightDelta?: number | null;
  isLoading?: boolean;
};

const WeightSparkline = ({ points, weightDelta, isLoading = false }: WeightSparklineProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const validPoints = points.filter((p) => p.weight !== null);
  const hasWeight = validPoints.length > 0;
  const latestWeight = hasWeight ? validPoints[validPoints.length - 1].weight : null;

  // Build bar chart
  const weights = validPoints.map((p) => p.weight as number);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const firstDate = points[0]?.dayLabel ?? '';
  const lastDate = points[points.length - 1]?.dayLabel ?? '';

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="title">Weight Progression</span>
        {weightDelta !== null && weightDelta !== undefined && (
          <span
            className={weightDelta <= 0 ? 'pill pill-success' : 'pill pill-danger'}
          >
            {weightDelta <= 0 ? '▼' : '▲'} {Math.abs(weightDelta).toFixed(1)}kg
          </span>
        )}
      </div>

      {!hasWeight ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          No weight data yet
        </p>
      ) : (
        <>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {latestWeight?.toFixed(1)}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', marginLeft: 4 }}>kg</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>Current Weight</p>

          {/* Sparkline bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48, width: '100%' }}>
            {points.map((p, i) => {
              const h = p.weight !== null
                ? Math.max(6, ((p.weight - minW) / range) * 40 + 8)
                : 4;
              const isLatest = i === points.length - 1;
              return (
                <div
                  key={p.date}
                  title={p.weight !== null ? `${p.dayLabel}: ${p.weight?.toFixed(1)} kg` : p.dayLabel}
                  style={{
                    flex: 1,
                    height: `${h}px`,
                    borderRadius: '3px 3px 0 0',
                    background: isLatest ? '#2563eb' : 'rgba(37,99,235,0.2)',
                    transition: 'height 400ms ease'
                  }}
                />
              );
            })}
          </div>

          {/* Date labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span className="overline">{firstDate}</span>
            <span className="overline">Today</span>
          </div>
        </>
      )}
    </div>
  );
};

export default WeightSparkline;
