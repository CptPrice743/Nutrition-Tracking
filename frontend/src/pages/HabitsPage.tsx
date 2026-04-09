import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

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
import { habitsApi } from '../lib/api';
import type { CreateHabitInput, Habit } from '../types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ordinal = (n: number) =>
  n +
  (n % 10 === 1 && n !== 11
    ? 'st'
    : n % 10 === 2 && n !== 12
      ? 'nd'
      : n % 10 === 3 && n !== 13
        ? 'rd'
        : 'th');

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
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: {
  habit: Habit;
  onEdit: (habit: Habit) => void;
  onArchiveToggle: (habitId: string) => Promise<void>;
  onDelete: (habit: Habit) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}): JSX.Element => {
  const calorieLabel = formatCalorieBadge(habit);
  const scheduledDayLabels = (habit.scheduledDays ?? [])
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .map((day) => DAY_LABELS[day]);
  const scheduledDateLabels = (habit.scheduledDates ?? [])
    .filter((date) => Number.isInteger(date) && date >= 1 && date <= 31)
    .map((date) => ordinal(date));

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
          {scheduledDayLabels.length > 0 ? (
            <p className="mt-1 text-xs text-gray-500">📅 {scheduledDayLabels.join(', ')}</p>
          ) : null}
          {scheduledDateLabels.length > 0 ? (
            <p className="mt-1 text-xs text-gray-500">📅 {scheduledDateLabels.join(', ')} of each month</p>
          ) : null}
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
          <Button type="button" variant="danger" onClick={() => onDelete(habit)}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};

const HabitsPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const { data: habits = [], isLoading } = useHabits();
  const createHabit = useCreateHabit();
  const archiveHabit = useArchiveHabit();
  const reorderHabits = useReorderHabits();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [localActiveHabits, setLocalActiveHabits] = useState<Habit[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const updateHabit = useUpdateHabit(editingHabit?.id ?? '');
  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      await habitsApi.delete(habitId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['habits'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-logs'] })
      ]);
      setDeletingHabit(null);
      setToastMessage('Habit deleted');
    },
    onError: () => {
      setPageError('Unable to delete habit right now. Please try again.');
    }
  });

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

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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

  const handleOpenDeleteModal = (habit: Habit) => {
    setPageError(null);
    setDeletingHabit(habit);
  };

  const handleCloseDeleteModal = () => {
    if (deleteHabitMutation.isPending) {
      return;
    }
    setDeletingHabit(null);
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
      scheduledDays: editingHabit.scheduledDays ?? undefined,
      scheduledDates: editingHabit.scheduledDates ?? undefined,
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
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-40 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success">
          {toastMessage}
        </div>
      ) : null}

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
                onDelete={handleOpenDeleteModal}
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
                  onDelete={handleOpenDeleteModal}
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

      <Modal
        isOpen={Boolean(deletingHabit)}
        onClose={handleCloseDeleteModal}
        title="Delete Habit"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseDeleteModal}
              disabled={deleteHabitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteHabitMutation.isPending}
              onClick={() => {
                if (!deletingHabit) {
                  return;
                }
                void deleteHabitMutation.mutateAsync(deletingHabit.id);
              }}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {deletingHabit
            ? `This will permanently delete '${deletingHabit.name}' and all its logged history. This cannot be undone.`
            : ''}
        </p>
      </Modal>
    </section>
  );
};

export default HabitsPage;
