import { useEffect, useMemo, useState } from 'react';

import HabitForm from '../components/forms/HabitForm';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import {
  useArchiveHabit,
  useCreateHabit,
  useHabits,
  useReorderHabits,
  useUpdateHabit
} from '../hooks/useHabits';
import type { CreateHabitInput, Habit } from '../types';

const formatFrequency = (habit: Habit): string => {
  switch (habit.frequencyType) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'x_per_week':
      return `${habit.frequencyX ?? 'X'} per week`;
    case 'x_per_month':
      return `${habit.frequencyX ?? 'X'} per month`;
    case 'x_in_y_days':
      return `${habit.frequencyX ?? 'X'} in ${habit.frequencyY ?? 'Y'} days`;
    default:
      return habit.frequencyType;
  }
};

const formatTarget = (habit: Habit): string => {
  if (habit.targetValue === null || habit.targetDirection === null) {
    return 'Target: none';
  }

  const direction = habit.targetDirection === 'at_least' ? 'At least' : 'At most';
  const unitSuffix = habit.habitType === 'count' && habit.unitLabel ? ` ${habit.unitLabel}` : '';
  return `Target: ${direction} ${habit.targetValue}${unitSuffix}`;
};

const formatCalorieBadge = (habit: Habit): string | null => {
  if (!habit.isCalorieBurning || !habit.calorieUnit || !habit.calorieKcal) {
    return null;
  }
  const unitText = habit.unitLabel ?? 'units';
  return `${habit.calorieUnit} ${unitText} = ${habit.calorieKcal} kcal`;
};

const HabitCard = ({
  habit,
  onEdit,
  onArchiveToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onArchiveToggle: (habitId: string) => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}): JSX.Element => {
  const calorieLabel = formatCalorieBadge(habit);

  return (
    <Card>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-slate-900">{habit.name}</p>
            <Badge variant="neutral">{habit.habitType === 'count' ? 'Count' : 'Boolean'}</Badge>
            {calorieLabel ? <Badge variant="success">{calorieLabel}</Badge> : null}
          </div>
          <p className="text-sm text-slate-600">Frequency: {formatFrequency(habit)}</p>
          <p className="text-sm text-slate-600">{formatTarget(habit)}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
          <button
            type="button"
            aria-label="Move up"
            disabled={isFirst}
            onClick={onMoveUp}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={isLast}
            onClick={onMoveDown}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↓
          </button>
          <Button type="button" variant="secondary" onClick={() => onEdit(habit)}>
            Edit
          </Button>
          <Button
            type="button"
            variant={habit.isActive ? 'danger' : 'secondary'}
            onClick={() => {
              void onArchiveToggle(habit.id);
            }}
          >
            {habit.isActive ? 'Archive' : 'Restore'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

const HabitsPage = (): JSX.Element => {
  const { data: habits = [], isLoading } = useHabits();
  const createHabit = useCreateHabit();
  const archiveHabit = useArchiveHabit();
  const reorderHabits = useReorderHabits();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [localActiveHabits, setLocalActiveHabits] = useState<Habit[]>([]);

  const updateHabit = useUpdateHabit(editingHabit?.id ?? '');

  const sortedHabits = useMemo(
    () => [...habits].sort((left, right) => left.displayOrder - right.displayOrder),
    [habits]
  );

  const activeHabits = useMemo(
    () => sortedHabits.filter((habit) => habit.isActive),
    [sortedHabits]
  );
  const archivedHabits = useMemo(
    () => sortedHabits.filter((habit) => !habit.isActive),
    [sortedHabits]
  );

  useEffect(() => {
    setLocalActiveHabits((currentHabits) => {
      const currentOrder = currentHabits.map((habit) => habit.id);
      const nextOrder = activeHabits.map((habit) => habit.id);

      if (
        currentOrder.length === nextOrder.length &&
        currentOrder.every((id, index) => id === nextOrder[index])
      ) {
        return currentHabits;
      }

      return activeHabits;
    });
  }, [activeHabits]);

  const handleOpenCreate = () => {
    setPageError(null);
    setEditingHabit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (habit: Habit) => {
    setPageError(null);
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const initialFormValues = useMemo<Partial<CreateHabitInput> | undefined>(() => {
    if (!editingHabit) {
      return undefined;
    }

    return {
      name: editingHabit.name,
      habitType: editingHabit.habitType,
      unitLabel: editingHabit.unitLabel ?? undefined,
      frequencyType: editingHabit.frequencyType,
      frequencyX: editingHabit.frequencyX ?? undefined,
      frequencyY: editingHabit.frequencyY ?? undefined,
      targetValue: editingHabit.targetValue ?? undefined,
      targetDirection: editingHabit.targetDirection ?? undefined,
      isCalorieBurning: editingHabit.isCalorieBurning,
      calorieUnit: editingHabit.calorieUnit ?? undefined,
      calorieKcal: editingHabit.calorieKcal ?? undefined
    };
  }, [editingHabit]);

  const handleSaveHabit = async (payload: CreateHabitInput) => {
    if (editingHabit) {
      await updateHabit.mutateAsync(payload);
    } else {
      await createHabit.mutateAsync(payload);
    }

    handleCloseModal();
  };

  const handleArchiveToggle = async (habitId: string) => {
    setPageError(null);
    try {
      await archiveHabit.mutateAsync(habitId);
    } catch {
      setPageError('Unable to update habit status right now. Please try again.');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localActiveHabits.length) return;

    const previousOrder = localActiveHabits;
    const reordered = Array.from(localActiveHabits);
    const [removed] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, removed);

    setLocalActiveHabits(reordered);
    setPageError(null);

    try {
      await reorderHabits.mutateAsync(reordered.map((h) => h.id));
    } catch {
      setLocalActiveHabits(previousOrder);
      setPageError('Unable to reorder habits. Please try again.');
    }
  };

  const isFormSaving = createHabit.isPending || updateHabit.isPending;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Habits</h1>
        <Button type="button" onClick={handleOpenCreate}>
          Add Habit
        </Button>
      </div>

      {pageError ? <p className="text-sm text-danger">{pageError}</p> : null}

      <Card
        title="Active Habits"
        action={<span className="text-sm text-slate-500">Use ↑↓ to reorder</span>}
      >
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading habits...</p>
        ) : localActiveHabits.length === 0 ? (
          <p className="text-sm text-slate-500">No active habits yet.</p>
        ) : (
          <div className="space-y-3">
            {localActiveHabits.map((habit, index) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isFirst={index === 0}
                isLast={index === localActiveHabits.length - 1}
                onMoveUp={() => {
                  void handleMove(index, 'up');
                }}
                onMoveDown={() => {
                  void handleMove(index, 'down');
                }}
                onEdit={handleOpenEdit}
                onArchiveToggle={handleArchiveToggle}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title={
          <button
            type="button"
            onClick={() => setArchivedOpen((open) => !open)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center text-base font-semibold text-slate-900"
          >
            Archived Habits ({archivedHabits.length})
          </button>
        }
        action={
          <Button type="button" size="sm" variant="ghost" onClick={() => setArchivedOpen((open) => !open)}>
            {archivedOpen ? 'Hide' : 'Show'}
          </Button>
        }
      >
        {archivedOpen ? (
          archivedHabits.length === 0 ? (
            <p className="text-sm text-slate-500">No archived habits.</p>
          ) : (
            <div className="space-y-3">
              {archivedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isFirst
                  isLast
                  onEdit={handleOpenEdit}
                  onArchiveToggle={handleArchiveToggle}
                />
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-slate-500">Archived list is collapsed.</p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingHabit ? 'Edit Habit' : 'Add Habit'}
      >
        <HabitForm
          initialValues={initialFormValues}
          isSubmitting={isFormSaving}
          submitLabel="Save Habit"
          onCancel={handleCloseModal}
          onSubmit={handleSaveHabit}
        />
      </Modal>
    </section>
  );
};

export default HabitsPage;
