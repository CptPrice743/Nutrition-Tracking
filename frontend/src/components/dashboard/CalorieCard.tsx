import Skeleton from '../ui/Skeleton';

export type CalorieCardProps = {
  consumed: number | null;
  target?: number;
  protein?: number | null;
  proteinGoal?: number;
  carbs?: number | null;
  carbsGoal?: number;
  fat?: number | null;
  fatGoal?: number;
  isLoading?: boolean;
};

const CalorieCard = ({
  consumed,
  target = 2000,
  protein,
  proteinGoal = 160,
  carbs,
  carbsGoal = 200,
  fat,
  fatGoal = 65,
  isLoading = false
}: CalorieCardProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-32 mb-3" />
        <Skeleton className="h-3 w-full mb-2" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const numericConsumed = consumed === null ? 0 : Math.max(0, Number(consumed));
  const progress = target > 0 ? Math.min(100, (numericConsumed / target) * 100) : 0;
  const pct = Math.round(progress);

  const pillVariant = pct >= 100 ? 'danger' : pct >= 80 ? 'info' : 'info';

  const macros = [
    { label: 'PROTEIN', value: protein, goal: proteinGoal, color: '#2563eb' },
    { label: 'CARBS', value: carbs, goal: carbsGoal, color: '#f59e0b' },
    { label: 'FAT', value: fat, goal: fatGoal, color: '#ef4444' }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="title">Calories Today</span>
        <span className={`pill pill-${pillVariant}`}>{pct}% reached</span>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ height: 6, marginBottom: 16 }}>
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Macro chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {macros.map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 8px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
              <span className="overline" style={{ fontSize: 9 }}>{m.label}</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: m.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {m.value !== null && m.value !== undefined ? Math.round(Number(m.value)) : '--'}
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>g</span>
            </div>
            <div className="overline" style={{ fontSize: 9, marginTop: 3 }}>Goal: {m.goal}g</div>
          </div>
        ))}
      </div>

      {consumed === null && (
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
          No intake logged yet
        </p>
      )}
    </div>
  );
};

export default CalorieCard;
