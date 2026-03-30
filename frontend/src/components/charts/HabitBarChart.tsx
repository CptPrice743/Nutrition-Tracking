import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import Card from '../ui/Card';
import type { HabitWeeklySummary } from '../../types';

type HabitBarChartProps = {
  habitSummary: HabitWeeklySummary;
};

type HabitBarPoint = {
  date: string;
  dayLabel: string;
  value: number;
};

const buildData = (habitSummary: HabitWeeklySummary): HabitBarPoint[] => {
  return [...habitSummary.dailyValues]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      dayLabel: format(new Date(entry.date), 'EEE'),
      value: Number(entry.value ?? 0)
    }));
};

const HabitBarChart = ({ habitSummary }: HabitBarChartProps): JSX.Element => {
  const chartData = buildData(habitSummary);

  return (
    <Card title={`${habitSummary.habitName} (Count)`}>
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No habit data for this week.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} width={42} />
            <Tooltip
              formatter={(value: number) => [`${Number(value).toFixed(2)}`, 'Logged value']}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as HabitBarPoint | undefined;
                return item?.date ?? '';
              }}
            />
            {habitSummary.targetValue !== null ? (
              <ReferenceLine
                y={Number(habitSummary.targetValue)}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: 'Target', position: 'insideTopRight', fill: '#ef4444' }}
              />
            ) : null}
            <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default HabitBarChart;
