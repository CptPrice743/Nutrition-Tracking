import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import Card from '../ui/Card';
import type { HabitWeeklySummary } from '../../types';

type HabitHeatmapProps = {
  habitSummary: HabitWeeklySummary;
  weekDates: string[];
};

type HeatmapPoint = {
  date: string;
  dayLabel: string;
  squareValue: number;
  status: 'done' | 'missed' | 'not_expected';
};

const statusColors: Record<HeatmapPoint['status'], string> = {
  done: '#22c55e',
  missed: '#ef4444',
  not_expected: '#94a3b8'
};

const buildHeatmapData = (habitSummary: HabitWeeklySummary, weekDates: string[]): HeatmapPoint[] => {
  const valuesByDate = new Map(habitSummary.dailyValues.map((item) => [item.date, item.value]));

  return weekDates.map((date) => {
    const rawValue = valuesByDate.get(date);
    const numericValue = rawValue === null || rawValue === undefined ? null : Number(rawValue);

    let status: HeatmapPoint['status'] = 'not_expected';
    if (numericValue !== null && numericValue > 0) {
      status = 'done';
    } else if (numericValue !== null) {
      status = 'missed';
    }

    return {
      date,
      dayLabel: format(new Date(date), 'EEE'),
      squareValue: 1,
      status
    };
  });
};

const HabitHeatmap = ({ habitSummary, weekDates }: HabitHeatmapProps): JSX.Element => {
  const chartData = buildHeatmapData(habitSummary, weekDates);

  return (
    <Card title={`${habitSummary.habitName} (Boolean)`}>
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No habit data for this week.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 28, right: 16, left: 16, bottom: 0 }}>
            <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} />
            <YAxis hide domain={[0, 1]} />
            <Tooltip
              formatter={(_, __, item) => {
                const payload = item.payload as HeatmapPoint;
                const label =
                  payload.status === 'done'
                    ? 'Done'
                    : payload.status === 'missed'
                      ? 'Missed'
                      : 'Not expected';
                return [label, payload.date];
              }}
              labelFormatter={() => ''}
            />
            <Bar dataKey="squareValue" radius={[4, 4, 4, 4]}>
              {chartData.map((entry) => (
                <Cell key={entry.date} fill={statusColors[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default HabitHeatmap;
