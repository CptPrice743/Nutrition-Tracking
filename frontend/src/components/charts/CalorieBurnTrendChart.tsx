import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { DailyLogSummary } from '../../types';

type Props = {
  dailyLogs: DailyLogSummary[];
};

const formatDateTick = (isoDate: string): string => format(parseISO(isoDate), 'dd MMM');

const CalorieBurnTrendChart = ({ dailyLogs }: Props): JSX.Element => {
  const chartData = [...dailyLogs]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((log) => ({
      date: log.date,
      caloriesBurned: Number(log.caloriesBurned ?? 0)
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No data for this period
      </div>
    );
  }

  const interval = chartData.length <= 14 ? 0 : Math.floor(chartData.length / 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 12, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatDateTick} interval={interval} minTickGap={18} />
        <YAxis label={{ value: 'kcal', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          formatter={(value: number) => [`${Number(value).toFixed(0)} kcal`, 'Calories Burned']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="caloriesBurned"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="#3b82f6"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default CalorieBurnTrendChart;
