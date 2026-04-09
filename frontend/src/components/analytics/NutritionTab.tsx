import FatInspectorChart from '../charts/FatInspectorChart';
import MacroConsistencyChart from '../charts/MacroConsistencyChart';
import WeightNetCaloriesChart from '../charts/WeightNetCaloriesChart';
import Skeleton from '../ui/Skeleton';
import type { AnalyticsResult } from '../../types';

type Props = {
  data: AnalyticsResult | undefined;
  isLoading: boolean;
  startDate: string;
  endDate: string;
};

const toNum = (v: number | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const fmt = (v: number | null | undefined, d = 1): string =>
  v == null ? '–' : Number(v).toFixed(d);

const Scorecard = ({
  label, value, sub, hero, subColor
}: {
  label: string; value: string; sub?: string; hero?: boolean; subColor?: string;
}): JSX.Element => {
  if (hero) {
    return (
      <div className="card-hero" style={{ padding: 16 }}>
        <div className="overline" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{label}</div>
        <div className="display" style={{ color: '#ffffff', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
        {sub && (
          <div style={{ fontSize: 12, color: subColor ?? 'rgba(255,255,255,0.5)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            {sub}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="overline" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: subColor ?? 'var(--text-tertiary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
};

const NutritionTab = ({ data, isLoading, startDate, endDate }: Props): JSX.Element => {
  const avgNet = toNum(data?.avgNetCalories);
  const periodDelta = toNum(data?.totalPeriodDeficitSurplus);
  const avgWeight = toNum(data?.avgWeightKg);
  const weightDelta = toNum(data?.weightDeltaVsPrevPeriod);
  const estimatedTDEE = toNum(data?.estimatedTDEE);
  const avgWater = toNum(data?.avgWaterLitres);

  const nutrientRows = [
    { label: 'Fiber', avg: toNum(data?.avgFiberG), rda: 35, unit: 'g' },
    { label: 'Sodium', avg: toNum(data?.avgSodiumMg), rda: 2300, unit: 'mg' },
    { label: 'Calcium', avg: toNum(data?.avgCalciumMg), rda: 1000, unit: 'mg' },
    { label: 'Iron', avg: toNum(data?.avgIronMg), rda: 18, unit: 'mg' },
    { label: 'Magnesium', avg: toNum(data?.avgMagnesiumMg), rda: 400, unit: 'mg' },
    { label: 'Zinc', avg: toNum(data?.avgZincMg), rda: 11, unit: 'mg' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Scorecard row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        className="md:!grid-cols-5"
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: 16, height: 100 }}>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))
        ) : (
          <>
            <Scorecard
              hero
              label="Avg Net Calories"
              value={avgNet !== null ? `${Math.round(avgNet).toLocaleString()}` : '–'}
              sub={avgNet !== null ? '↗ kcal/day' : undefined}
            />
            <Scorecard
              label="Period Deficit"
              value={periodDelta !== null ? `${periodDelta < 0 ? '' : '+'}${Math.round(periodDelta).toLocaleString()}` : '–'}
              sub="kcal total"
            />
            <Scorecard
              label="Avg Weight"
              value={avgWeight !== null ? `${avgWeight.toFixed(1)} kg` : '–'}
              sub={weightDelta !== null
                ? `${weightDelta <= 0 ? '↙' : '↗'} ${Math.abs(weightDelta).toFixed(1)}kg`
                : undefined}
              subColor={weightDelta !== null ? (weightDelta <= 0 ? 'var(--success-text)' : 'var(--danger-text)') : undefined}
            />
            <Scorecard
              label="Est. TDEE"
              value={estimatedTDEE !== null ? `${Math.round(estimatedTDEE).toLocaleString()}` : '–'}
              sub="kcal/day"
            />
            <Scorecard
              label="Avg Water"
              value={avgWater !== null ? `${avgWater.toFixed(1)} L` : '–'}
              sub="✓ Daily Goal"
              subColor="var(--success-text)"
            />
          </>
        )}
      </div>

      {/* Main charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:!grid-cols-[3fr_2fr]">
        <div className="card">
          <h3 className="title" style={{ marginBottom: 16 }}>Weight vs. Net Energy</h3>
          {data && !isLoading ? (
            <WeightNetCaloriesChart
              dailyLogs={data.dailyLogSummaries}
              baselineTDEE={data.baselineTDEE}
            />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </div>

        <div className="card">
          <h3 className="title" style={{ marginBottom: 16 }}>Macro Consistency</h3>
          {data && !isLoading ? (
            <MacroConsistencyChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </div>
      </div>

      {/* Second chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:!grid-cols-2">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="title">Fat Inspector</h3>
            <span className="overline" style={{ background: 'var(--surface-container-low)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>Omega Ratio 1:4</span>
          </div>
          {data && !isLoading ? (
            <FatInspectorChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[240px] w-full" />
          )}
        </div>

        <div className="card">
          <h3 className="title" style={{ marginBottom: 16 }}>Micronutrient Progress</h3>
          {isLoading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
              {nutrientRows.map((row) => {
                const pct = row.avg !== null ? Math.min(100, (row.avg / row.rda) * 100) : 0;
                const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                return (
                  <div key={row.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        {row.avg !== null ? `${fmt(row.avg, 0)}${row.unit}` : '–'} / {row.rda}{row.unit}
                      </span>
                    </div>
                    <div className="progress-track" style={{ height: 4 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionTab;
