import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export type MacroDonutProps = {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  isLoading?: boolean;
};

type DonutPoint = {
  name: 'Protein' | 'Carbs' | 'Fat';
  value: number;
  color: string;
  legendClassName: string;
};

const MacroDonut = ({ protein, carbs, fat, isLoading = false }: MacroDonutProps): JSX.Element => {
  if (isLoading) {
    return (
      <Card title="Macro Donut">
        <Skeleton className="h-40 w-full" />
      </Card>
    );
  }

  const data: DonutPoint[] = [
    {
      name: 'Protein',
      value: Math.max(0, Number(protein ?? 0)),
      color: '#3b82f6',
      legendClassName: 'bg-blue-500'
    },
    {
      name: 'Carbs',
      value: Math.max(0, Number(carbs ?? 0)),
      color: '#f59e0b',
      legendClassName: 'bg-amber-500'
    },
    {
      name: 'Fat',
      value: Math.max(0, Number(fat ?? 0)),
      color: '#ef4444',
      legendClassName: 'bg-red-500'
    }
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card title="Macro Donut">
      {total === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          No macro data for today.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${Number(value).toFixed(0)} g`, '']} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 text-sm text-slate-700">
            {data.map((entry) => {
              const pct = total === 0 ? 0 : (entry.value / total) * 100;
              return (
                <div key={entry.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${entry.legendClassName}`} />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MacroDonut;
