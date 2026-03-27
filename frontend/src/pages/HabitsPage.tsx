import HabitForm from '../components/forms/HabitForm';
import Card from '../components/ui/Card';
import { useCreateHabit, useHabits } from '../hooks/useHabits';

const HabitsPage = (): JSX.Element => {
  const { data: habits } = useHabits();
  const createHabit = useCreateHabit();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Habits</h1>
      <HabitForm
        onSubmit={async (payload) => {
          await createHabit.mutateAsync(payload);
        }}
      />
      <div className="grid gap-3">
        {(habits ?? []).map((habit) => (
          <Card key={habit.id}>
            <p className="font-medium">{habit.name}</p>
            <p className="text-sm text-slate-600">{habit.frequencyType}</p>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default HabitsPage;
