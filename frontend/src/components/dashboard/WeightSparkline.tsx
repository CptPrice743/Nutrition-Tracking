import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export type WeightSparklinePoint = {
  date: string;
  dayLabel: string;
  weight: number | null;
};

export type WeightSparklineProps = {
  points: WeightSparklinePoint[];
  isLoading?: boolean;
};

const WeightSparkline = ({ points, isLoading = false }: WeightSparklineProps): JSX.Element => {
  if (isLoading) {
    return (
      <Card title="Weight Trend">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const hasWeight = points.some((point) => point.weight !== null);

  return (
    <Card title="Weight Trend (7 Days)">
      {!hasWeight ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-500">
          No weight entries yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={points} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <XAxis dataKey="dayLabel" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
            <Tooltip
              formatter={(value: number) => [`${Number(value).toFixed(2)} kg`, 'Weight']}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as WeightSparklinePoint | undefined;
                return point?.date ?? '';
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 2, fill: '#0f172a' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default WeightSparkline;
