import { useCallback, useMemo } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';

import WidgetGrid from '../components/dashboard/WidgetGrid';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
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
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatValue = (
  value: number | null | undefined,
  options?: { suffix?: string; decimals?: number }
): string => {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return '--';
  }

  return `${numeric.toFixed(options?.decimals ?? 0)}${options?.suffix ?? ''}`;
};

const DashboardPage = (): JSX.Element => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      try {
        return (await logsApi.getByDate(todayUtc)).data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    }
  });

  const todayHabitLogsQuery = useQuery({
    queryKey: ['dashboard', 'today-habit-logs', todayUtc],
    queryFn: async () =>
      (await habitLogsApi.list({ startDate: todayUtc, endDate: todayUtc })).data
  });

  const weeklyAnalyticsQuery = useQuery({
    queryKey: ['dashboard', 'weekly-analytics', currentWeekStart, todayUtc],
    queryFn: async () =>
      (
        await analyticsApi.get({
          startDate: currentWeekStart,
          endDate: todayUtc
        })
      ).data
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
    queryFn: async () =>
      (await logsApi.list({ startDate: sparklineStart, endDate: todayUtc })).data
  });

  const streakHabitLogsQuery = useQuery({
    queryKey: ['dashboard', 'streak-habit-logs', streakStart, todayUtc],
    queryFn: async () =>
      (await habitLogsApi.list({ startDate: streakStart, endDate: todayUtc })).data
  });

  const todayBurned = useMemo(() => {
    const logs = todayHabitLogsQuery.data ?? [];
    return logs.reduce((sum, log) => sum + Number(log.caloriesBurned ?? 0), 0);
  }, [todayHabitLogsQuery.data]);

  const hasTodayLog = todayLogQuery.data !== null && todayLogQuery.data !== undefined;
  const todayConsumed = hasTodayLog ? toNumberOrNull(todayLogQuery.data?.caloriesConsumed) : null;
  const todayBurnedDisplay = hasTodayLog ? toNumberOrNull(todayBurned) : null;

  const netToday =
    todayConsumed !== null && todayBurnedDisplay !== null ? todayConsumed - todayBurnedDisplay : null;

  const netVariant: 'success' | 'warning' | 'danger' | 'neutral' =
    netToday === null ? 'neutral' : netToday < 0 ? 'success' : netToday <= 200 ? 'warning' : 'danger';

  const weeklyAvgWeight = toNumberOrNull(weeklyAnalyticsQuery.data?.avgWeightKg);
  const weeklyDelta = toNumberOrNull(weeklyAnalyticsQuery.data?.weightDeltaVsPrevPeriod);

  const sparklineData = useMemo(() => {
    const logsByDate = new Map((sparklineLogsQuery.data ?? []).map((log) => [log.date, log]));

    return Array.from({ length: 7 }, (_, index) => {
      const day = addUtcDays(todayDate, index - 6);
      const date = toIsoDateUtc(day);
      const dayLabel = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        timeZone: 'UTC'
      }).format(day);
      const existingLog = logsByDate.get(date);

      return {
        date,
        dayLabel,
        weight: toNumberOrNull(existingLog?.weightKg)
      };
    });
  }, [sparklineLogsQuery.data, todayDate]);

  const activeHabits = useMemo(
    () => (habitsQuery.data ?? []).filter((habit) => habit.isActive),
    [habitsQuery.data]
  );

  const habitStreaks = useMemo(() => {
    const valueByHabitAndDate = new Map<string, number>();

    for (const log of streakHabitLogsQuery.data ?? []) {
      const numericValue = Number(log.value ?? 0);
      valueByHabitAndDate.set(`${log.habitId}:${log.logDate}`, numericValue);
    }

    return activeHabits.map((habit) => {
      let streak = 0;

      for (let offset = 0; offset < 60; offset += 1) {
        const date = toIsoDateUtc(addUtcDays(todayDate, -offset));
        const key = `${habit.id}:${date}`;
        const value = valueByHabitAndDate.get(key);

        if (value === undefined || value <= 0) {
          break;
        }

        streak += 1;
      }

      return {
        habitId: habit.id,
        habitName: habit.name,
        streak
      };
    });
  }, [activeHabits, streakHabitLogsQuery.data, todayDate]);

  const isPinnedRowLoading =
    todayLogQuery.isLoading || todayHabitLogsQuery.isLoading || weeklyAnalyticsQuery.isLoading;

  const actionHref = `/daily-log/${todayUtc}`;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Home Dashboard</h1>

        {todayLogQuery.isLoading ? (
          <Skeleton className="h-12 w-40" />
        ) : hasTodayLog ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              navigate(actionHref);
            }}
          >
            Edit Today's Log
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="min-h-[52px] px-8"
            onClick={() => {
              navigate(actionHref);
            }}
          >
            Log Today
          </Button>
        )}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Today's Calories">
          {isPinnedRowLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900">
                {todayConsumed === null ? '--' : `${todayConsumed.toFixed(0)} kcal`} /{' '}
                {todayBurnedDisplay === null ? '--' : `${todayBurnedDisplay.toFixed(0)} kcal`}
              </p>
              <p className="mt-1 text-sm text-slate-500">Consumed vs burned</p>
            </>
          )}
        </Card>

        <Card title="Today's Net Deficit / Surplus">
          {isPinnedRowLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900">
                {netToday === null ? '--' : `${netToday.toFixed(0)} kcal`}
              </p>
              <div className="mt-2">
                <Badge variant={netVariant}>
                  {netToday === null
                    ? 'No data'
                    : netToday < 0
                      ? 'Deficit'
                      : netToday <= 200
                        ? 'Near balance'
                        : 'Surplus'}
                </Badge>
              </div>
            </>
          )}
        </Card>

        <Card title="This Week Avg Weight">
          {weeklyAnalyticsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-6 w-28" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-slate-900">
                {formatValue(weeklyAvgWeight, { decimals: 2, suffix: ' kg' })}
              </p>
              <div className="mt-2">
                <Badge
                  variant={
                    weeklyDelta === null
                      ? 'neutral'
                      : weeklyDelta <= 0
                        ? 'success'
                        : 'warning'
                  }
                >
                  {weeklyDelta === null
                    ? '--'
                    : `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta.toFixed(2)} kg vs prev week`}
                </Badge>
              </div>
            </>
          )}
        </Card>
      </section>

      <WidgetGrid
        layout={dashboardLayoutQuery.data}
        isLoadingLayout={dashboardLayoutQuery.isLoading}
        onSaveLayout={handleSaveLayout}
        calorieCardProps={{
          consumed: todayConsumed,
          target: 2000,
          isLoading: todayLogQuery.isLoading
        }}
        weightSparklineProps={{
          points: sparklineData,
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
    </section>
  );
};

export default DashboardPage;
