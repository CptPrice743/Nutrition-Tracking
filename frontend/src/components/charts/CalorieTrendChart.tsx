import { format } from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import Card from '../ui/Card';
import type { WeeklyAnalytics } from '../../types';

type CalorieTrendChartProps = {
  dailyLogs: WeeklyAnalytics['dailyLogs'];
};

type CalorieChartPoint = {
  index: number;
  date: string;
  dayLabel: string;
  intake: number;
  burned: number;
};

const buildCalorieData = (dailyLogs: WeeklyAnalytics['dailyLogs']): CalorieChartPoint[] => {
  return [...dailyLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((log, index) => ({
      index,
      date: log.date,
      dayLabel: format(new Date(log.date), 'EEE'),
      intake: Number(log.caloriesConsumed ?? 0),
      burned: Number(log.caloriesBurned ?? 0)
    }));
};

const CalorieTrendChart = ({ dailyLogs }: CalorieTrendChartProps): JSX.Element => {
  const chartData = buildCalorieData(dailyLogs);

  return (
    <Card title="Calorie Intake vs Burned">
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
          No calorie data for this week.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="index"
              type="number"
              domain={[-0.5, chartData.length - 0.5]}
              ticks={chartData.map((point) => point.index)}
              tickFormatter={(value) => chartData.find((point) => point.index === value)?.dayLabel ?? ''}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} width={42} />

            {chartData.map((point) => {
              const y1 = Math.min(point.intake, point.burned);
              const y2 = Math.max(point.intake, point.burned);
              const isDeficit = point.burned > point.intake;

              return (
                <ReferenceArea
                  key={point.date}
                  x1={point.index - 0.45}
                  x2={point.index + 0.45}
                  y1={y1}
                  y2={y2}
                  fill={isDeficit ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)'}
                  strokeOpacity={0}
                />
              );
            })}

            <Tooltip
              formatter={(value: number, name: string) => {
                const label = name === 'intake' ? 'Intake' : 'Burned';
                return [`${Number(value).toFixed(0)} kcal`, label];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as CalorieChartPoint | undefined;
                return item?.date ?? '';
              }}
            />
            <Line
              type="monotone"
              dataKey="intake"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
            />
            <Line
              type="monotone"
              dataKey="burned"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default CalorieTrendChart;
