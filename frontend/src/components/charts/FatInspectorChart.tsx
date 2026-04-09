import { format, parseISO } from 'date-fns';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

const FatInspectorChart = ({ dailyLogs }: Props): JSX.Element => {
  const chartData = [...dailyLogs]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((log) => ({
      date: log.date,
      fatSaturatedG: log.fatSaturatedG,
      fatUnsaturatedG: log.fatUnsaturatedG
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
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Separating dairy/animal fats from healthy fats over time</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 16, right: 16, left: 12, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tickFormatter={formatDateTick} interval={interval} minTickGap={18} />
          <YAxis label={{ value: 'g', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(value: string | number | Array<string | number>, name: string) => {
              const label = name === 'fatSaturatedG' ? 'Saturated Fat' : 'Unsaturated Fat';
              const baseValue = Array.isArray(value) ? value[0] : value;
              const numeric =
                baseValue === null || baseValue === undefined || baseValue === ''
                  ? '-'
                  : Number(baseValue).toFixed(1);
              return [`${numeric} g`, label];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="fatSaturatedG"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Saturated Fat"
          />
          <Line
            type="monotone"
            dataKey="fatUnsaturatedG"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            name="Unsaturated Fat"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FatInspectorChart;
