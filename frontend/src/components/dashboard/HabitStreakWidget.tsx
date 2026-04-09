import Skeleton from '../ui/Skeleton';

export type HabitStreakItem = {
  habitId: string;
  habitName: string;
  streak: number;
};

export type HabitStreakWidgetProps = {
  streaks: HabitStreakItem[];
  isLoading?: boolean;
};

const HABIT_COLORS = ['#2563eb', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'];

const HabitStreakWidget = ({ streaks, isLoading = false }: HabitStreakWidgetProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-40 mb-3" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (streaks.length === 0) {
    return (
      <div className="card">
        <span className="title" style={{ display: 'block', marginBottom: 12 }}>Performance Habits</span>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
          No habits yet — add some in Habits
        </p>
      </div>
    );
  }

  const ranked = [...streaks].sort((a, b) => b.streak - a.streak).slice(0, 5);

  return (
    <div className="card">
      <span className="title" style={{ display: 'block', marginBottom: 16 }}>Performance Habits</span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ranked.map((habit, i) => {
          const color = HABIT_COLORS[i % HABIT_COLORS.length];
          const progressPct = Math.min(100, (habit.streak / 30) * 100);

          return (
            <div key={habit.habitId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-lg)',
                  background: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {['💧', '🏃', '🥗', '😴', '💊', '🧘'][i % 6]}
                </span>
              </div>

              {/* Name + bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {habit.habitName}
                  </span>
                  <span className="streak-badge" style={{ marginLeft: 8, flexShrink: 0 }}>
                    {habit.streak}d Streak
                  </span>
                </div>
                <div className="progress-track" style={{ height: 4 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%`, background: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HabitStreakWidget;
