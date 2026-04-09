import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import Skeleton from '../ui/Skeleton';

export type MacroDonutProps = {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  isLoading?: boolean;
};

const MacroDonut = ({ protein, carbs, fat, isLoading = false }: MacroDonutProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className="card">
        <Skeleton className="h-6 w-32 mb-3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const data = [
    { name: 'Protein', value: Math.max(0, Number(protein ?? 0)), color: '#2563eb' },
    { name: 'Carbs', value: Math.max(0, Number(carbs ?? 0)), color: '#f59e0b' },
    { name: 'Fat', value: Math.max(0, Number(fat ?? 0)), color: '#ef4444' }
  ];

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card">
      <span className="title" style={{ display: 'block', marginBottom: 16 }}>Macro Split</span>

      {total === 0 ? (
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No macro data for today</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(0)} g`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            {data.map((d) => {
              const pct = total === 0 ? 0 : (d.value / total) * 100;
              return (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.value.toFixed(0)}g</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MacroDonut;
