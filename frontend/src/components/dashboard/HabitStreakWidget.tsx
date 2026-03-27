import Card from '../ui/Card';

const HabitStreakWidget = (): JSX.Element => {
  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-600">Habit Streak</h3>
      <p className="mt-2 text-xl font-semibold">-- days</p>
    </Card>
  );
};

export default HabitStreakWidget;
