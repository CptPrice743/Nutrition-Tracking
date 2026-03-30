import { format } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import Card from '../ui/Card';
import type { WeeklyAnalytics } from '../../types';

type WeightTrendChartProps = {
  dailyLogs: WeeklyAnalytics['dailyLogs'];
};

type WeightChartPoint = {
  date: string;
  dayLabel: string;
  weight: number | null;
  rollingAvg7: number | null;
};

const buildWeightChartData = (dailyLogs: WeeklyAnalytics['dailyLogs']): WeightChartPoint[] => {
  const sorted = [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date));

  return sorted.map((log, index) => {
    const windowStart = Math.max(0, index - 6);
    const slice = sorted.slice(windowStart, index + 1);
    const validWeights = slice
      .map((entry) => (entry.weightKg === null ? null : Number(entry.weightKg)))
      .filter((value): value is number => value !== null && !Number.isNaN(value));

    const rollingAvg7 =
      validWeights.length > 0
        ? validWeights.reduce((sum, value) => sum + value, 0) / validWeights.length
        : null;

    return {
      date: log.date,
      dayLabel: format(new Date(log.date), 'EEE'),
      weight: log.weightKg === null ? null : Number(log.weightKg),
      rollingAvg7
    };
  });
};

const WeightTrendChart = ({ dailyLogs }: WeightTrendChartProps): JSX.Element => {
  const chartData = buildWeightChartData(dailyLogs);

  return (
    <Card title="Weight Trend">
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No weight data for this week.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} width={42} />
            <Tooltip
              formatter={(value, name) => {
                const numericValue = Number(value);

                if (Number.isNaN(numericValue)) {
                  return ['--', name];
                }

                const label = name === 'rollingAvg7' ? '7-day rolling average' : 'Weight';
                return [`${numericValue.toFixed(2)} kg`, label];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as WeightChartPoint | undefined;
                return item?.date ?? '';
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={{ r: 3, fill: '#3b82f6' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="rollingAvg7"
              stroke="#0f172a"
              strokeWidth={3}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default WeightTrendChart;
