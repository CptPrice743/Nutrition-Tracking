import { format } from 'date-fns';

import CalorieTrendChart from '../components/charts/CalorieTrendChart';
import HabitBarChart from '../components/charts/HabitBarChart';
import HabitHeatmap from '../components/charts/HabitHeatmap';
import MacroStackedBar from '../components/charts/MacroStackedBar';
import WeightTrendChart from '../components/charts/WeightTrendChart';
import { useWeeklyAnalytics } from '../hooks/useAnalytics';

const getIsoWeekLabel = (): string => {
  const now = new Date();
  const year = format(now, 'RRRR');
  const week = format(now, 'II');
  return `${year}-W${week}`;
};

const AnalyticsPage = (): JSX.Element => {
  const week = getIsoWeekLabel();
  const { data } = useWeeklyAnalytics(week);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-slate-600">Week: {data?.weekLabel ?? week}</p>
      <WeightTrendChart />
      <CalorieTrendChart />
      <MacroStackedBar />
      <HabitBarChart />
      <HabitHeatmap />
    </section>
  );
};

export default AnalyticsPage;
