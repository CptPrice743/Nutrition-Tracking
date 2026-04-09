import { format, parseISO } from 'date-fns';
import {
  Bar,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { DailyLogSummary } from '../../types';

type Props = {
  dailyLogs: DailyLogSummary[];
  baselineTDEE: number | null;
};

type ChartPoint = {
  date: string;
  weightKg: number | null;
  netCalories: number | null;
};

const toNumberOrNull = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatDateTick = (isoDate: string): string => {
  return format(parseISO(isoDate), 'dd MMM');
};

const WeightNetCaloriesChart = ({ dailyLogs, baselineTDEE }: Props): JSX.Element => {
  const chartData: ChartPoint[] = [...dailyLogs]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((log) => ({
      date: log.date,
      weightKg: toNumberOrNull(log.weightKg),
      netCalories: toNumberOrNull(log.netCalories)
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
      <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tickFormatter={formatDateTick} interval={interval} minTickGap={18} />
        <YAxis
          yAxisId="weight"
          domain={['auto', 'auto']}
          label={{ value: 'kg', angle: -90, position: 'insideLeft' }}
        />
        <YAxis
          yAxisId="calories"
          orientation="right"
          domain={['auto', 'auto']}
          label={{ value: 'kcal', angle: 90, position: 'insideRight' }}
        />

        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload || payload.length === 0) {
              return null;
            }

            const row = payload[0]?.payload as ChartPoint;
            return (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                <p className="mb-1 font-medium text-gray-700">{label}</p>
                {row.weightKg !== null ? (
                  <p className="text-blue-600">Weight: {row.weightKg.toFixed(2)} kg</p>
                ) : null}
                {row.netCalories !== null ? (
                  <p className={row.netCalories <= 0 ? 'text-green-600' : 'text-red-600'}>
                    Net Calories: {row.netCalories.toFixed(0)} kcal
                  </p>
                ) : null}
              </div>
            );
          }}
        />

        <Bar yAxisId="calories" dataKey="netCalories" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={`net-${entry.date}`}
              fill={entry.netCalories !== null && entry.netCalories > 0 ? '#ef4444' : '#22c55e'}
            />
          ))}
        </Bar>

        <Line
          yAxisId="weight"
          type="monotone"
          dataKey="weightKg"
          stroke="#3b82f6"
          strokeWidth={2}
          connectNulls={false}
          dot={{ r: 3, fill: '#3b82f6', stroke: '#3b82f6' }}
        />

        {baselineTDEE !== null ? (
          <ReferenceLine
            yAxisId="calories"
            y={baselineTDEE}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: 'Baseline', position: 'insideTopRight', fontSize: 11 }}
          />
        ) : null}

        {chartData.length > 30 ? <Brush dataKey="date" height={20} stroke="#e5e7eb" /> : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default WeightNetCaloriesChart;
