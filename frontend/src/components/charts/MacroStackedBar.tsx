import { format } from 'date-fns';
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

import Card from '../ui/Card';
import type { WeeklyAnalytics } from '../../types';

type MacroStackedBarProps = {
  dailyLogs: WeeklyAnalytics['dailyLogs'];
};

type MacroChartPoint = {
  date: string;
  dayLabel: string;
  protein: number;
  carbs: number;
  fat: number;
};

const buildMacroData = (dailyLogs: WeeklyAnalytics['dailyLogs']): MacroChartPoint[] => {
  return [...dailyLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log) => ({
      date: log.date,
      dayLabel: format(new Date(log.date), 'EEE'),
      protein: Number(log.proteinG ?? 0),
      carbs: Number(log.carbsG ?? 0),
      fat: Number(log.fatTotalG ?? 0)
    }));
};

const MacroStackedBar = ({ dailyLogs }: MacroStackedBarProps): JSX.Element => {
  const chartData = buildMacroData(dailyLogs);

  return (
    <Card title="Macros by Day">
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No macro data for this week.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} width={42} />
            <Tooltip
              formatter={(value: number, name: string) => {
                return [`${Number(value).toFixed(0)} g`, name];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as MacroChartPoint | undefined;
                return item?.date ?? '';
              }}
            />
            <Legend />
            <Bar dataKey="protein" stackId="macros" fill="#3b82f6" name="Protein" />
            <Bar dataKey="carbs" stackId="macros" fill="#f59e0b" name="Carbs" />
            <Bar dataKey="fat" stackId="macros" fill="#ef4444" name="Fat" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default MacroStackedBar;
