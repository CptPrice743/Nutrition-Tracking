import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { DailyLogSummary } from '../../types';

type Props = {
  dailyLogs: DailyLogSummary[];
};

type MacroPoint = {
  date: string;
  proteinG: number;
  netCarbsG: number;
  fatTotalG: number;
};

const formatDateTick = (isoDate: string): string => format(parseISO(isoDate), 'dd MMM');

const MacroConsistencyChart = ({ dailyLogs }: Props): JSX.Element => {
  const chartData: MacroPoint[] = [...dailyLogs]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((log) => {
      const protein = Number(log.proteinG ?? 0);
      const carbs = Number(log.carbsG ?? 0);
      const fiber = Number(log.fiberG ?? 0);
      const fat = Number(log.fatTotalG ?? 0);

      return {
        date: log.date,
        proteinG: protein,
        netCarbsG: carbs - fiber,
        fatTotalG: fat
      };
    });

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
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 12, bottom: 28 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatDateTick} interval={interval} minTickGap={18} />
        <YAxis />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'proteinG') {
              return [`${Number(value).toFixed(1)} g`, 'Protein'];
            }
            if (name === 'netCarbsG') {
              return [`${Number(value).toFixed(1)} g`, 'Net Carbs'];
            }
            return [`${Number(value).toFixed(1)} g`, 'Fat'];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend verticalAlign="bottom" />
        <Bar stackId="macros" dataKey="proteinG" fill="#3b82f6" name="Protein" />
        <Bar stackId="macros" dataKey="netCarbsG" fill="#f59e0b" name="Net Carbs" />
        <Bar stackId="macros" dataKey="fatTotalG" fill="#ef4444" name="Fat" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MacroConsistencyChart;
