import { useNavigate } from 'react-router-dom';

import FatInspectorChart from '../charts/FatInspectorChart';
import MacroConsistencyChart from '../charts/MacroConsistencyChart';
import WeightNetCaloriesChart from '../charts/WeightNetCaloriesChart';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import Skeleton from '../ui/Skeleton';
import type { AnalyticsResult } from '../../types';
import { useAuth } from '../../hooks/useAuth';

type Props = {
  data: AnalyticsResult | undefined;
  isLoading: boolean;
  startDate: string;
  endDate: string;
};

type NutrientRow = {
  label: string;
  average: number | null;
  rda: number;
  unit: string;
};

const toNumberOrNull = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatNumber = (value: number | null | undefined, decimals = 1): string => {
  const numeric = toNumberOrNull(value);
  return numeric === null ? '-' : numeric.toFixed(decimals);
};

const getProgressColor = (percent: number): 'success' | 'warning' | 'danger' => {
  if (percent >= 80) {
    return 'success';
  }
  if (percent >= 50) {
    return 'warning';
  }
  return 'danger';
};

const NutritionTab = ({ data, isLoading, startDate, endDate }: Props): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const calorieTarget = toNumberOrNull(user?.calorieTarget);
  const avgNetCalories = toNumberOrNull(data?.avgNetCalories);
  const periodDelta = toNumberOrNull(data?.totalPeriodDeficitSurplus);
  const avgWeightKg = toNumberOrNull(data?.avgWeightKg);
  const weightDelta = toNumberOrNull(data?.weightDeltaVsPrevPeriod);
  const estimatedTDEE = toNumberOrNull(data?.estimatedTDEE);
  const baselineTDEE = toNumberOrNull(data?.baselineTDEE);
  const baselineDelta =
    estimatedTDEE !== null && baselineTDEE !== null ? estimatedTDEE - baselineTDEE : null;

  const normalDays = Number(data?.normalDays ?? 0);
  const restaurantDays = Number(data?.restaurantDays ?? 0);
  const dayTotal = Math.max(normalDays + restaurantDays, 1);
  const normalPercent = (normalDays / dayTotal) * 100;

  const nutrientRows: NutrientRow[] = [
    { label: 'Fiber', average: toNumberOrNull(data?.avgFiberG), rda: 30, unit: 'g' },
    { label: 'Sodium', average: toNumberOrNull(data?.avgSodiumMg), rda: 2300, unit: 'mg' },
    { label: 'Calcium', average: toNumberOrNull(data?.avgCalciumMg), rda: 1000, unit: 'mg' },
    { label: 'Iron', average: toNumberOrNull(data?.avgIronMg), rda: 18, unit: 'mg' },
    { label: 'Zinc', average: toNumberOrNull(data?.avgZincMg), rda: 11, unit: 'mg' },
    { label: 'Magnesium', average: toNumberOrNull(data?.avgMagnesiumMg), rda: 400, unit: 'mg' }
  ];

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500">
        Period: {startDate} to {endDate}
      </p>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card title="Avg Net Calories">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p
                className={`text-2xl font-semibold ${
                  calorieTarget === null || avgNetCalories === null
                    ? 'text-gray-700'
                    : avgNetCalories < calorieTarget
                      ? 'text-success'
                      : 'text-danger'
                }`}
              >
                {avgNetCalories === null ? '-' : `${avgNetCalories.toFixed(1)} kcal`}
              </p>
              {calorieTarget !== null ? (
                <p className="mt-2 text-xs text-gray-500">Target: {calorieTarget.toFixed(0)} kcal</p>
              ) : null}
            </>
          )}
        </Card>

        <Card title="Period Deficit/Surplus">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p
                className={`text-2xl font-semibold ${
                  periodDelta === null ? 'text-gray-700' : periodDelta > 0 ? 'text-danger' : 'text-success'
                }`}
              >
                {periodDelta === null
                  ? '-'
                  : `${periodDelta > 0 ? '+' : '-'}${Math.abs(periodDelta).toFixed(0)} kcal`}
              </p>
              <p className="mt-2 text-xs text-gray-500">Total period</p>
            </>
          )}
        </Card>

        <Card title="Avg Weight & Delta">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {avgWeightKg === null ? '-' : `${avgWeightKg.toFixed(2)} kg`}
              </p>
              <p
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                  weightDelta === null
                    ? 'bg-gray-100 text-gray-500'
                    : weightDelta > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {weightDelta === null
                  ? '-'
                  : `${weightDelta > 0 ? '▲ +' : '▼ -'}${Math.abs(weightDelta).toFixed(1)} kg`}
              </p>
            </>
          )}
        </Card>

        <Card title="Estimated TDEE">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {estimatedTDEE === null ? '-' : `${estimatedTDEE.toFixed(0)} kcal`}
              </p>
              <p className="mt-2 text-xs text-gray-500">This period</p>
            </>
          )}
        </Card>

        <Card title="Baseline TDEE">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {baselineTDEE === null ? '-' : `${baselineTDEE.toFixed(0)} kcal`}
              </p>
              {baselineTDEE === null ? (
                <button
                  type="button"
                  className="mt-2 text-sm text-accent-600 hover:underline"
                  onClick={() => navigate('/settings')}
                >
                  Set up -&gt;
                </button>
              ) : null}
            </>
          )}
        </Card>

        <Card title="vs. Baseline">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p
                className={`text-2xl font-semibold ${
                  baselineDelta === null
                    ? 'text-gray-700'
                    : baselineDelta > 0
                      ? 'text-danger'
                      : 'text-success'
                }`}
              >
                {baselineDelta === null
                  ? '-'
                  : `${baselineDelta > 0 ? '+' : '-'}${Math.abs(baselineDelta).toFixed(0)} kcal`}
              </p>
              <p className="mt-2 text-xs text-gray-500">Actual vs. Baseline</p>
            </>
          )}
        </Card>

        <Card title="Day Type Ratio">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {normalDays}n / {restaurantDays}r
              </p>
              <div className="mt-3">
                <ProgressBar value={normalPercent} colorScheme="success" />
              </div>
            </>
          )}
        </Card>

        <Card title="Avg Water">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900">
              {data?.avgWaterLitres === null || data?.avgWaterLitres === undefined
                ? '-'
                : `${Number(data.avgWaterLitres).toFixed(1)} L`}
            </p>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Weight vs. Net Calories">
          {data && !isLoading ? (
            <WeightNetCaloriesChart
              dailyLogs={data.dailyLogSummaries}
              baselineTDEE={data.baselineTDEE}
            />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>

        <Card title="Macro Consistency">
          {data && !isLoading ? (
            <MacroConsistencyChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>

        <Card title="Fat Inspector">
          {data && !isLoading ? (
            <FatInspectorChart dailyLogs={data.dailyLogSummaries} />
          ) : (
            <Skeleton className="h-[300px] w-full" />
          )}
        </Card>
      </section>

      <Card title="Daily Averages vs. Target">
        {isLoading ? (
          <Skeleton className="h-52 w-full" />
        ) : (
          <div className="space-y-4">
            {nutrientRows.map((row) => {
              const average = toNumberOrNull(row.average);
              const progress = average === null ? 0 : Math.min((average / row.rda) * 100, 100);
              const colorScheme = average === null ? 'neutral' : getProgressColor(progress);

              return (
                <div key={row.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{row.label}</span>
                    <span className="text-gray-500">
                      {average === null
                        ? `- / ${row.rda} ${row.unit}`
                        : `${formatNumber(average, 1)} / ${row.rda} ${row.unit}`}
                    </span>
                  </div>
                  <ProgressBar value={progress} colorScheme={colorScheme} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default NutritionTab;
