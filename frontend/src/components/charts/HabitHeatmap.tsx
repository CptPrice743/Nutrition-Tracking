import Card from '../ui/Card';

const HabitHeatmap = (): JSX.Element => {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600">Habit Heatmap</h3>
      <div className="mt-3 h-64 rounded-md border border-dashed border-slate-300" />
    </Card>
  );
};

export default HabitHeatmap;
