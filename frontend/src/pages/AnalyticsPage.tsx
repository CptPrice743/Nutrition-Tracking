import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import CalorieTrendChart from '../components/charts/CalorieTrendChart';
import HabitBarChart from '../components/charts/HabitBarChart';
import HabitHeatmap from '../components/charts/HabitHeatmap';
import MacroStackedBar from '../components/charts/MacroStackedBar';
import WeightTrendChart from '../components/charts/WeightTrendChart';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import { useWeeklyAnalytics } from '../hooks/useAnalytics';
import { cn } from '../lib/utils';

const TOUCH_THRESHOLD_PX = 50;

function toISOWeekParam(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);
  const weekNum = Math.round((d.getTime() - firstThursday.getTime()) / 604800000) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMondayOfISOWeek(weekParam: string): Date {
  const [yearStr, weekStr] = weekParam.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4.getTime());
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + (week - 1) * 7);
  return monday;
}

const formatUtcDate = (
  date: Date,
  options: Intl.DateTimeFormatOptions
): string => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    ...options
  }).format(date);
};

const toIsoDateUtc = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toWeekRangeLabel = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart.getTime());
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const startLabel = formatUtcDate(weekStart, {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });
  const endLabel = formatUtcDate(weekEnd, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  return `Week of ${startLabel} – ${endLabel}`;
};

const toNumberOrNull = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatValue = (
  value: number | null | undefined,
  options?: { decimals?: number; suffix?: string }
): string => {
  const numeric = toNumberOrNull(value);
  if (numeric === null) {
    return '--';
  }

  const decimals = options?.decimals ?? 1;
  const suffix = options?.suffix ?? '';
  return `${numeric.toFixed(decimals)}${suffix}`;
};

const SummarySkeletonCard = (): JSX.Element => (
  <Card>
    <div className="space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </Card>
);

const AnalyticsPage = (): JSX.Element => {
  const [weekParam, setWeekParam] = useState<string>(() => toISOWeekParam(new Date()));
  const currentWeekParam = useMemo(() => toISOWeekParam(new Date()), []);
  const weekStart = useMemo(() => getMondayOfISOWeek(weekParam), [weekParam]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
    return end;
  }, [weekStart]);
  const currentWeekStart = useMemo(() => getMondayOfISOWeek(currentWeekParam), [currentWeekParam]);
  const touchStartXRef = useRef<number | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const weekLabel = useMemo(() => toWeekRangeLabel(weekStart), [weekStart]);

  const goToPreviousWeek = useCallback(() => {
    setWeekParam((current) => {
      const monday = getMondayOfISOWeek(current);
      monday.setUTCDate(monday.getUTCDate() - 7);
      return toISOWeekParam(monday);
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekParam((current) => {
      const monday = getMondayOfISOWeek(current);
      const candidate = new Date(monday.getTime());
      candidate.setUTCDate(candidate.getUTCDate() + 7);
      return candidate.getTime() > currentWeekStart.getTime() ? current : toISOWeekParam(candidate);
    });
  }, [currentWeekStart]);

  useEffect(() => {
    const node = pageRef.current;
    if (!node) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startX = touchStartXRef.current;
      if (startX === null) {
        return;
      }

      const endX = event.changedTouches[0]?.clientX ?? startX;
      const deltaX = startX - endX;
      touchStartXRef.current = null;

      if (Math.abs(deltaX) < TOUCH_THRESHOLD_PX) {
        return;
      }

      if (deltaX > 0) {
        goToNextWeek();
      } else {
        goToPreviousWeek();
      }
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [goToNextWeek, goToPreviousWeek]);

  const { data: analytics, isLoading, isError } = useWeeklyAnalytics(weekParam);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart.getTime());
      day.setUTCDate(day.getUTCDate() + index);
      return toIsoDateUtc(day);
    });
  }, [weekStart]);

  const countHabits = useMemo(() => {
    return (analytics?.habitSummaries ?? []).filter((summary) => summary.habitType === 'count');
  }, [analytics]);

  const booleanHabits = useMemo(() => {
    return (analytics?.habitSummaries ?? []).filter((summary) => summary.habitType === 'boolean');
  }, [analytics]);

  const normalDays = Number(analytics?.normalDays ?? 0);
  const restaurantDays = Number(analytics?.restaurantDays ?? 0);
  const dayTypeTotal = Math.max(normalDays + restaurantDays, 1);
  const normalPct = (normalDays / dayTypeTotal) * 100;
  const nextDisabled = weekStart.getTime() >= currentWeekStart.getTime();

  const weightDelta = toNumberOrNull(analytics?.weightDeltaVsPrevWeek);
  const totalWeeklyDelta = toNumberOrNull(analytics?.totalWeeklyDeficitSurplus);
  const estimatedTDEE = toNumberOrNull(analytics?.estimatedTDEE);
  const tdeeLow = estimatedTDEE === null ? null : estimatedTDEE * 0.9;
  const tdeeHigh = estimatedTDEE === null ? null : estimatedTDEE * 1.1;

  return (
    <section ref={pageRef} className="space-y-5">
      <header className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPreviousWeek}
            aria-label="Previous week"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            ←
          </button>

          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-600">{weekLabel}</p>
          </div>

          <button
            type="button"
            onClick={goToNextWeek}
            aria-label="Next week"
            disabled={nextDisabled}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      </header>

      {isError ? (
        <Card>
          <p className="text-sm text-danger">Unable to load analytics for this week.</p>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, index) => <SummarySkeletonCard key={index} />)
        ) : (
          <>
            <Card title="Avg Weight">
              <p className="text-2xl font-semibold text-slate-900">{formatValue(analytics?.avgWeightKg, { suffix: ' kg' })}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Delta vs prev week</span>
                <Badge
                  variant={
                    weightDelta === null
                      ? 'neutral'
                      : weightDelta <= 0
                        ? 'success'
                        : 'danger'
                  }
                >
                  {weightDelta === null ? '--' : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(2)} kg`}
                </Badge>
              </div>
            </Card>

            <Card title="Calories">
              <div className="space-y-1 text-sm text-slate-700">
                <p>Consumed: {formatValue(analytics?.avgCaloriesConsumed, { decimals: 0, suffix: ' kcal' })}</p>
                <p>Burned: {formatValue(analytics?.avgCaloriesBurned, { decimals: 0, suffix: ' kcal' })}</p>
                <p>Net: {formatValue(analytics?.avgNetCalories, { decimals: 0, suffix: ' kcal' })}</p>
              </div>
            </Card>

            <Card title="Weekly Deficit / Surplus">
              <p
                className={cn(
                  'text-3xl font-semibold',
                  totalWeeklyDelta === null
                    ? 'text-slate-700'
                    : totalWeeklyDelta <= 0
                      ? 'text-success'
                      : 'text-danger'
                )}
              >
                {totalWeeklyDelta === null ? '--' : `${totalWeeklyDelta.toFixed(0)} kcal`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {totalWeeklyDelta === null
                  ? 'No data'
                  : totalWeeklyDelta <= 0
                    ? 'Deficit'
                    : 'Surplus'}
              </p>
            </Card>

            <Card title="Avg Macros">
              <div className="space-y-1 text-sm text-slate-700">
                <p>Protein: {formatValue(analytics?.avgProteinG, { suffix: ' g' })}</p>
                <p>Carbs: {formatValue(analytics?.avgCarbsG, { suffix: ' g' })}</p>
                <p>Fat: {formatValue(analytics?.avgFatTotalG, { suffix: ' g' })}</p>
              </div>
            </Card>

            <Card title="Avg Micronutrients">
              <div className="space-y-1 text-sm text-slate-700">
                <p>Magnesium: {formatValue(analytics?.avgMagnesiumMg, { suffix: ' mg' })}</p>
                <p>Iron: {formatValue(analytics?.avgIronMg, { suffix: ' mg' })}</p>
                <p>Zinc: {formatValue(analytics?.avgZincMg, { suffix: ' mg' })}</p>
              </div>
            </Card>

            <Card title="Avg Water">
              <p className="text-2xl font-semibold text-slate-900">{formatValue(analytics?.avgWaterLitres, { suffix: ' L' })}</p>
            </Card>

            <Card title="Day Type Ratio">
              <p className="text-2xl font-semibold text-slate-900">{normalDays}N / {restaurantDays}R</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full bg-accent-600" style={{ width: `${normalPct}%` }} />
              </div>
            </Card>

            <Card title="Estimated TDEE (±10%)">
              <p className="text-2xl font-semibold text-slate-900">
                {estimatedTDEE === null ? '--' : `${estimatedTDEE.toFixed(0)} kcal`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {tdeeLow === null || tdeeHigh === null
                  ? 'Insufficient data'
                  : `${tdeeLow.toFixed(0)} - ${tdeeHigh.toFixed(0)} kcal`}
              </p>
            </Card>

            <Card title="4-Week Rolling TDEE">
              <p className="text-2xl font-semibold text-slate-900">
                {analytics?.rollingAvgTDEE === null || analytics?.rollingAvgTDEE === undefined
                  ? 'Insufficient data'
                  : `${Number(analytics.rollingAvgTDEE).toFixed(0)} kcal`}
              </p>
            </Card>
          </>
        )}
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-[300px] w-full" />
              </Card>
            ))}
          </div>
        ) : analytics ? (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              <WeightTrendChart dailyLogs={analytics.dailyLogs} />
              <CalorieTrendChart dailyLogs={analytics.dailyLogs} />
              <MacroStackedBar dailyLogs={analytics.dailyLogs} />
            </div>

            {countHabits.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {countHabits.map((habitSummary) => (
                  <HabitBarChart key={habitSummary.habitId} habitSummary={habitSummary} />
                ))}
              </div>
            ) : null}

            {booleanHabits.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {booleanHabits.map((habitSummary) => (
                  <HabitHeatmap
                    key={habitSummary.habitId}
                    habitSummary={habitSummary}
                    weekDates={weekDates}
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
};

export default AnalyticsPage;
