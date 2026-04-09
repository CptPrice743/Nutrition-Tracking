import { format, parseISO } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { HabitPeriodSummary } from '../../types';

type Props = {
  habit: HabitPeriodSummary;
};

type ChartPoint = {
  date: string;
  value: number;
};

const formatDateTick = (isoDate: string): string => format(parseISO(isoDate), 'dd MMM');

const HabitTargetBarChart = ({ habit }: Props): JSX.Element => {
  const chartData: ChartPoint[] = [...habit.dailyValues]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((entry) => ({
      date: entry.date,
      value: Number(entry.value ?? 0)
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No data for this period
      </div>
    );
  }

  const targetValue = habit.targetValue;
  const unitLabel = habit.unitLabel ?? '';
  const interval = chartData.length <= 14 ? 0 : Math.floor(chartData.length / 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 12, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatDateTick} interval={interval} minTickGap={18} />
        <YAxis label={{ value: unitLabel || 'value', angle: -90, position: 'insideLeft' }} />
        <Tooltip
          formatter={(value: number) => [
            `${Number(value).toFixed(1)}${unitLabel ? ` ${unitLabel}` : ''}`,
            'Value'
          ]}
          labelFormatter={(label) => `Date: ${label}`}
        />

        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((point) => {
            let fill = '#ef4444';

            if (targetValue !== null && targetValue !== undefined && targetValue > 0) {
              if (point.value >= targetValue) {
                fill = '#22c55e';
              } else if (point.value >= targetValue * 0.75) {
                fill = '#f59e0b';
              } else {
                fill = '#ef4444';
              }
            } else if (point.value > 0) {
              fill = '#22c55e';
            }

            return <Cell key={`value-${point.date}`} fill={fill} />;
          })}
        </Bar>

        {targetValue !== null && targetValue !== undefined ? (
          <ReferenceLine
            y={targetValue}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{
              value: `Target: ${targetValue}${unitLabel ? ` ${unitLabel}` : ''}`,
              position: 'insideTopRight',
              fontSize: 11
            }}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default HabitTargetBarChart;
