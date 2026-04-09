import { useEffect, useMemo, useState } from 'react';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import CalorieBurnTrendChart from '../charts/CalorieBurnTrendChart';
import HabitHeatmapChart from '../charts/HabitHeatmapChart';
import HabitTargetBarChart from '../charts/HabitTargetBarChart';
import Card from '../ui/Card';
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
    if (habits.length === 0) {
      setSelectedHabitId('');
      return;
    }

    if (!selectedHabitId || !habits.some((habit) => habit.habitId === selectedHabitId)) {
      setSelectedHabitId(habits[0].habitId);
    }
  }, [habits, selectedHabitId]);

  const selectedHabit = useMemo(
    () => habits.find((habit) => habit.habitId === selectedHabitId),
    [habits, selectedHabitId]
  );

  const averageCompletionRate =
    habits.length > 0
      ? habits.reduce((sum, habit) => sum + Number(habit.completionRate ?? 0), 0) / habits.length
      : null;

  const streaks = [...habits]
    .filter((habit) => habit.currentStreak > 2)
    .sort((left, right) => right.currentStreak - left.currentStreak);

  const donutData = [
    {
      name: 'Completed',
      value:
        averageCompletionRate === null
          ? 0
          : Math.max(0, Math.min(100, Number(averageCompletionRate.toFixed(1))))
    },
    {
      name: 'Missed',
      value:
        averageCompletionRate === null
          ? 100
          : 100 - Math.max(0, Math.min(100, Number(averageCompletionRate.toFixed(1))))
    }
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Period: {startDate} to {endDate}
      </p>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="Completion Rate">
          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      innerRadius={42}
                      outerRadius={62}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill="#22c55e" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {averageCompletionRate === null ? '-' : `${averageCompletionRate.toFixed(0)}%`}
              </p>
              <p className="text-sm text-gray-500">of scheduled habits completed</p>
            </div>
          )}
        </Card>

        <Card title="Active Streaks">
          {isLoading ? (
            <Skeleton className="h-44 w-full" />
          ) : streaks.length === 0 ? (
            <p className="text-sm text-gray-400">No active streaks yet</p>
          ) : (
            <div className="space-y-2">
              {streaks.map((habit) => (
                <div key={habit.habitId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{habit.habitName}</span>
                  <span className="text-sm text-gray-600">{'\ud83d\udd25'} {habit.currentStreak} days</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Calorie Burn Trend">
          {data && !isLoading ? (
            <CalorieBurnTrendChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[250px] w-full" />
          )}
        </Card>
      </section>

      <Card title="Habit Deep-Dive">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : habits.length === 0 ? (
          <p className="text-sm text-gray-500">No habits tracked in this period</p>
        ) : (
          <div className="space-y-4">
            <select
              value={selectedHabitId}
              onChange={(event) => setSelectedHabitId(event.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-gray-200 px-3 text-sm text-gray-700"
            >
              {habits.map((habit) => (
                <option key={habit.habitId} value={habit.habitId}>
                  {habit.habitName}
                </option>
              ))}
            </select>

            {selectedHabit ? (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Current Streak</p>
                    <p className="mt-1 font-semibold text-gray-900">{'\ud83d\udd25'} {selectedHabit.currentStreak} days</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Longest Streak</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedHabit.longestStreak} days</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Completion Rate</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedHabit.completionRate.toFixed(0)}%</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">Total Completions</p>
                    <p className="mt-1 font-semibold text-gray-900">{selectedHabit.totalCompletions} times</p>
                  </div>
                </div>

                {data && !isLoading ? (
                  <HabitHeatmapChart
                    habit={selectedHabit}
                    startDate={startDate}
                    endDate={endDate}
                  />
                ) : (
                  <Skeleton className="h-[200px] w-full" />
                )}

                {selectedHabit.habitType === 'count' ? (
                  <>
                    {data && !isLoading ? (
                      <HabitTargetBarChart habit={selectedHabit} />
                    ) : (
                      <Skeleton className="h-[250px] w-full" />
                    )}
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
};

export default HabitTab;
