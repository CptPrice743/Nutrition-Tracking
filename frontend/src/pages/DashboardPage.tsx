import { useCallback, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

import WidgetGrid from '../components/dashboard/WidgetGrid';
import { useAuth } from '../hooks/useAuth';
import {
  analyticsApi,
  dashboardApi,
  habitLogsApi,
  habitsApi,
  logsApi
} from '../lib/api';

const toIsoDateUtc = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addUtcDays = (date: Date, days: number): Date => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const toNumberOrNull = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getTimeOfDay = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

const formatDate = (): string => {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase();
};

const DashboardPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const firstName = (user?.displayName ?? 'there').split(' ')[0];
  const calorieTarget = toNumberOrNull(user?.calorieTarget) ?? 2000;

  const todayUtc = useMemo(() => toIsoDateUtc(new Date()), []);
  const todayDate = useMemo(() => new Date(`${todayUtc}T00:00:00.000Z`), [todayUtc]);
  const sparklineStart = useMemo(() => toIsoDateUtc(addUtcDays(todayDate, -6)), [todayDate]);
  const streakStart = useMemo(() => toIsoDateUtc(addUtcDays(todayDate, -59)), [todayDate]);
  const currentWeekStart = useMemo(() => {
    const d = new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate()));
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return toIsoDateUtc(d);
  }, [todayDate]);

  const todayLogQuery = useQuery({
    queryKey: ['dashboard', 'today-log', todayUtc],
    queryFn: async () => {
      try { return (await logsApi.getByDate(todayUtc)).data; }
      catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    }
  });

  const todayHabitLogsQuery = useQuery({
    queryKey: ['dashboard', 'today-habit-logs', todayUtc],
    queryFn: async () => (await habitLogsApi.list({ startDate: todayUtc, endDate: todayUtc })).data
  });

  const weeklyAnalyticsQuery = useQuery({
    queryKey: ['dashboard', 'weekly-analytics', currentWeekStart, todayUtc],
    queryFn: async () => (await analyticsApi.get({ startDate: currentWeekStart, endDate: todayUtc })).data
  });

  const dashboardLayoutQuery = useQuery({
    queryKey: ['dashboard', 'layout'],
    queryFn: async () => (await dashboardApi.getLayout()).data.layoutJson,
    staleTime: Infinity
  });

  const handleSaveLayout = useCallback(
    async (layoutJson: { widgetId: string; position: number; size: 'small' | 'medium' | 'large' }[]) => {
      await dashboardApi.saveLayout(layoutJson);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'layout'] });
    },
    [queryClient]
  );

  const habitsQuery = useQuery({
    queryKey: ['dashboard', 'habits'],
    queryFn: async () => (await habitsApi.list()).data
  });

  const sparklineLogsQuery = useQuery({
    queryKey: ['dashboard', 'sparkline-logs', sparklineStart, todayUtc],
    queryFn: async () => (await logsApi.list({ startDate: sparklineStart, endDate: todayUtc })).data
  });

  const streakHabitLogsQuery = useQuery({
    queryKey: ['dashboard', 'streak-habit-logs', streakStart, todayUtc],
    queryFn: async () => (await habitLogsApi.list({ startDate: streakStart, endDate: todayUtc })).data
  });

  const todayBurned = useMemo(() => {
    const logs = todayHabitLogsQuery.data ?? [];
    return logs.reduce((sum, log) => sum + Number(log.caloriesBurned ?? 0), 0);
  }, [todayHabitLogsQuery.data]);

  const hasTodayLog = todayLogQuery.data !== null && todayLogQuery.data !== undefined;
  const todayConsumed = hasTodayLog ? toNumberOrNull(todayLogQuery.data?.caloriesConsumed) : null;
  const todayBurnedDisplay = hasTodayLog ? toNumberOrNull(todayBurned) : null;
  const netToday = todayConsumed !== null && todayBurnedDisplay !== null ? todayConsumed - todayBurnedDisplay : null;
  const deficit = todayConsumed !== null ? calorieTarget - todayConsumed : null;

  // Status for hero card
  const calorieStatus = todayConsumed === null
    ? null
    : todayConsumed < calorieTarget * 0.95
      ? 'on-track'
      : todayConsumed <= calorieTarget
        ? 'on-track'
        : 'over';

  const weeklyAvgWeight = toNumberOrNull(weeklyAnalyticsQuery.data?.avgWeightKg);
  const weeklyDelta = toNumberOrNull(weeklyAnalyticsQuery.data?.weightDeltaVsPrevPeriod);

  const sparklineData = useMemo(() => {
    const logsByDate = new Map((sparklineLogsQuery.data ?? []).map((log) => [log.date, log]));
    return Array.from({ length: 7 }, (_, index) => {
      const day = addUtcDays(todayDate, index - 6);
      const date = toIsoDateUtc(day);
      const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(day);
      const existingLog = logsByDate.get(date);
      return { date, dayLabel, weight: toNumberOrNull(existingLog?.weightKg) };
    });
  }, [sparklineLogsQuery.data, todayDate]);

  const activeHabits = useMemo(
    () => (habitsQuery.data ?? []).filter((habit) => habit.isActive),
    [habitsQuery.data]
  );

  const habitStreaks = useMemo(() => {
    const valueByHabitAndDate = new Map<string, number>();
    for (const log of streakHabitLogsQuery.data ?? []) {
      valueByHabitAndDate.set(`${log.habitId}:${log.logDate}`, Number(log.value ?? 0));
    }
    return activeHabits.map((habit) => {
      let streak = 0;
      for (let offset = 0; offset < 60; offset += 1) {
        const date = toIsoDateUtc(addUtcDays(todayDate, -offset));
        const value = valueByHabitAndDate.get(`${habit.id}:${date}`);
        if (value === undefined || value <= 0) break;
        streak += 1;
      }
      return { habitId: habit.id, habitName: habit.name, streak };
    });
  }, [activeHabits, streakHabitLogsQuery.data, todayDate]);

  const actionHref = `/daily-log/${todayUtc}`;
  const isHeroLoading = todayLogQuery.isLoading || todayHabitLogsQuery.isLoading;

  return (
    <div className="page-container">
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 24
        }}
        className="md:!flex-row md:!items-start md:!justify-between"
      >
        <div>
          <span className="overline" style={{ display: 'block', marginBottom: 2 }}>
            {formatDate()}
          </span>
          <h1 className="headline">
            Good {getTimeOfDay()}, {firstName} 👋
          </h1>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate(actionHref)}
          style={{ marginTop: 4, alignSelf: 'flex-start' }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Today&apos;s Log
        </button>
      </div>

      {/* Hero card */}
      <div className="card-hero" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="overline" style={{ color: 'rgba(255,255,255,0.5)' }}>Daily Calories</span>
          {!isHeroLoading && calorieStatus && (
            <span className={calorieStatus === 'on-track' ? 'pill pill-success' : 'pill pill-danger'}>
              {calorieStatus === 'on-track' ? 'On Track' : 'Over Target'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: '4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {isHeroLoading ? '–––' : (todayConsumed !== null ? todayConsumed.toLocaleString() : '0')}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-hero-muted)' }}>
            /{calorieTarget.toLocaleString()}
          </span>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-hero-muted)', marginBottom: 16 }}>kcal target</p>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 0 16px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            {
              label: 'Burned',
              value: isHeroLoading ? '–' : (todayBurnedDisplay !== null ? todayBurnedDisplay.toLocaleString() : '0'),
              unit: 'kcal',
              color: '#4ade80'
            },
            {
              label: 'Net',
              value: isHeroLoading ? '–' : (netToday !== null ? netToday.toLocaleString() : '0'),
              unit: 'kcal',
              color: '#ffffff'
            },
            {
              label: 'Deficit',
              value: isHeroLoading ? '–' : (deficit !== null ? Math.abs(deficit).toLocaleString() : '0'),
              unit: 'kcal',
              color: deficit !== null && deficit > 0 ? '#4ade80' : '#f87171'
            },
            {
              label: 'Protein',
              value: isHeroLoading ? '–' : (hasTodayLog && todayLogQuery.data?.proteinG !== null ? String(Math.round(Number(todayLogQuery.data?.proteinG ?? 0))) : '0'),
              unit: 'g',
              color: '#ffffff'
            }
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                padding: '0 8px'
              }}
            >
              <div className="overline" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{stat.unit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget grid */}
      <WidgetGrid
        layout={dashboardLayoutQuery.data}
        isLoadingLayout={dashboardLayoutQuery.isLoading}
        onSaveLayout={handleSaveLayout}
        calorieCardProps={{
          consumed: todayConsumed,
          target: calorieTarget,
          protein: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.proteinG) : null,
          carbs: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.carbsG) : null,
          fat: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.fatTotalG) : null,
          isLoading: todayLogQuery.isLoading
        }}
        weightSparklineProps={{
          points: sparklineData,
          weightDelta: weeklyDelta,
          isLoading: sparklineLogsQuery.isLoading
        }}
        macroDonutProps={{
          protein: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.proteinG) : null,
          carbs: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.carbsG) : null,
          fat: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.fatTotalG) : null,
          isLoading: todayLogQuery.isLoading
        }}
        waterRingProps={{
          litres: hasTodayLog ? toNumberOrNull(todayLogQuery.data?.waterLitres) : null,
          target: 3,
          isLoading: todayLogQuery.isLoading
        }}
        habitStreakWidgetProps={{
          streaks: habitStreaks,
          isLoading: habitsQuery.isLoading || streakHabitLogsQuery.isLoading
        }}
      />

      {/* Weekly weight (secondary stat) */}
      {weeklyAvgWeight !== null && (
        <div className="card" style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="overline" style={{ display: 'block', marginBottom: 4 }}>This Week Avg Weight</span>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {weeklyAvgWeight.toFixed(1)} <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-secondary)' }}>kg</span>
            </span>
          </div>
          {weeklyDelta !== null && (
            <span className={weeklyDelta <= 0 ? 'pill pill-success' : 'pill pill-warning'}>
              {weeklyDelta > 0 ? '+' : ''}{weeklyDelta.toFixed(2)} kg vs prev week
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
