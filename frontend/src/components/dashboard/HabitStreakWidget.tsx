import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

export type HabitStreakItem = {
  habitId: string;
  habitName: string;
  streak: number;
};

export type HabitStreakWidgetProps = {
  streaks: HabitStreakItem[];
  isLoading?: boolean;
};

const HabitStreakWidget = ({ streaks, isLoading = false }: HabitStreakWidgetProps): JSX.Element => {
  if (isLoading) {
    return (
      <Card title="Habit Streaks">
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  if (streaks.length === 0) {
    return (
      <Card title="Habit Streaks">
        <p className="text-sm text-slate-500">No active habits yet.</p>
      </Card>
    );
  }

  const ranked = [...streaks].sort((a, b) => b.streak - a.streak);

  return (
    <Card title="Habit Streaks">
      <ul className="space-y-2">
        {ranked.map((habit) => (
          <li key={habit.habitId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-800">{habit.habitName}</span>
            <Badge variant={habit.streak >= 7 ? 'success' : habit.streak > 0 ? 'warning' : 'neutral'}>
              {habit.streak} day{habit.streak === 1 ? '' : 's'}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default HabitStreakWidget;
