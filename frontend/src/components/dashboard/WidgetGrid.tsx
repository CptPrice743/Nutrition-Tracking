import CalorieCard from './CalorieCard';
import HabitStreakWidget from './HabitStreakWidget';
import MacroDonut from './MacroDonut';
import WaterRing from './WaterRing';
import WeightSparkline from './WeightSparkline';

const WidgetGrid = (): JSX.Element => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CalorieCard />
      <WeightSparkline />
      <MacroDonut />
      <WaterRing />
      <HabitStreakWidget />
    </div>
  );
};

export default WidgetGrid;
