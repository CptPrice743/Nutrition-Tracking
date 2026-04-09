import { useEffect, useMemo, useState } from 'react';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import CalorieBurnTrendChart from '../charts/CalorieBurnTrendChart';
import HabitHeatmapChart from '../charts/HabitHeatmapChart';
import HabitTargetBarChart from '../charts/HabitTargetBarChart';
import Skeleton from '../ui/Skeleton';
import type { AnalyticsResult } from '../../types';

type Props = {
  data: AnalyticsResult | undefined;
  isLoading: boolean;
  startDate: string;
  endDate: string;
};

const HabitTab = ({ data, isLoading, startDate, endDate }: Props): JSX.Element => {
  const habits = data?.habitSummaries ?? [];
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');

  useEffect(() => {
    if (habits.length === 0) { setSelectedHabitId(''); return; }
    if (!selectedHabitId || !habits.some((h) => h.habitId === selectedHabitId)) {
      setSelectedHabitId(habits[0].habitId);
    }
  }, [habits, selectedHabitId]);

  const selectedHabit = useMemo(
    () => habits.find((h) => h.habitId === selectedHabitId),
    [habits, selectedHabitId]
  );

  const avgCompletion = habits.length > 0
    ? habits.reduce((s, h) => s + Number(h.completionRate ?? 0), 0) / habits.length
    : null;

  const activeStreaks = [...habits].filter((h) => h.currentStreak > 2).sort((a, b) => b.currentStreak - a.currentStreak);

  const donutData = [
    { name: 'Completed', value: avgCompletion !== null ? Math.max(0, Math.min(100, Number(avgCompletion.toFixed(1)))) : 0 },
    { name: 'Missed', value: avgCompletion !== null ? 100 - Math.max(0, Math.min(100, Number(avgCompletion.toFixed(1)))) : 100 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Scorecard row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="md:!grid-cols-4">
        {/* Hero: completion rate */}
        <div className="card-hero" style={{ padding: 16 }}>
          <div className="overline" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Completion Rate</div>
          <div className="display" style={{ color: '#ffffff', lineHeight: 1.1 }}>
            {avgCompletion !== null ? `${Math.round(avgCompletion)}%` : '–'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>of scheduled habits</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="overline" style={{ marginBottom: 8 }}>Active Streaks</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {activeStreaks.length}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="overline" style={{ marginBottom: 8 }}>Total Completions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {habits.reduce((s, h) => s + h.totalCompletions, 0)}
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="overline" style={{ marginBottom: 8 }}>Avg Daily Burns</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            –
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>kcal</div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:!grid-cols-2">
        {/* Completion donut */}
        <div className="card">
          <h3 className="title" style={{ marginBottom: 16 }}>Habit Completion Over Time</h3>
          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 144, height: 144 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={42} outerRadius={62} startAngle={90} endAngle={-270} stroke="none">
                      <Cell fill="#22c55e" />
                      <Cell fill="var(--surface-container-low)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {avgCompletion !== null ? `${Math.round(avgCompletion)}%` : '–'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>completed</div>
              </div>
            </div>
          )}
        </div>

        {/* Calorie burn trend */}
        <div className="card">
          <h3 className="title" style={{ marginBottom: 16 }}>Calorie Burn Trend</h3>
          {data && !isLoading ? (
            <CalorieBurnTrendChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[250px] w-full" />
          )}
        </div>
      </div>

      {/* Habit deep-dive */}
      <div className="card">
        <h3 className="title" style={{ marginBottom: 16 }}>Habit Deep-Dive</h3>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : habits.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No habits tracked in this period</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Habit selector */}
            <div>
              <label className="field-label" htmlFor="habit-select">Select a habit</label>
              <div style={{ position: 'relative' }}>
                <select
                  id="habit-select"
                  className="input"
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  style={{ paddingRight: 36, appearance: 'none', cursor: 'pointer' }}
                >
                  {habits.map((h) => (
                    <option key={h.habitId} value={h.habitId}>{h.habitName}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>▾</span>
              </div>
            </div>

            {selectedHabit && (
              <>
                {/* 4 mini scorecards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="md:!grid-cols-4">
                  {[
                    { label: 'Current Streak', value: `🔥 ${selectedHabit.currentStreak} days` },
                    { label: 'Longest Streak', value: `${selectedHabit.longestStreak} days` },
                    { label: 'Completion Rate', value: `${selectedHabit.completionRate.toFixed(0)}%` },
                    { label: 'Total Completions', value: `${selectedHabit.totalCompletions}` }
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: 'var(--surface-container-low)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '12px',
                        textAlign: 'center'
                      }}
                    >
                      <div className="overline" style={{ marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Heatmap */}
                {data && !isLoading ? (
                  <HabitHeatmapChart
                    habit={selectedHabit}
                    startDate={startDate}
                    endDate={endDate}
                  />
                ) : (
                  <Skeleton className="h-[200px] w-full" />
                )}

                {/* Target bar chart (count habits only) */}
                {selectedHabit.habitType === 'count' && data && !isLoading ? (
                  <HabitTargetBarChart habit={selectedHabit} />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitTab;
