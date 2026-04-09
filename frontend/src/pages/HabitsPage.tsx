import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import HabitForm from '../components/forms/HabitForm';
import CommonModal from '../components/common/Modal';
import {
  useArchiveHabit,
  useCreateHabit,
  useHabits,
  useReorderHabits,
  useUpdateHabit
} from '../hooks/useHabits';
import { habitsApi, habitLogsApi } from '../lib/api';
import type { CreateHabitInput, Habit } from '../types';

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
};

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Get last 7 days Mon→Sun alignment
const getLast7Days = (): string[] => {
  const todayUtc = new Date();
  const today = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()));
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(today, i - 6)));
};

const HABIT_CATEGORY_ICONS: Record<string, string> = {
  default: '✓',
  water: '💧',
  protein: '🥩',
  sleep: '😴',
  exercise: '🏃',
  vitamin: '💊',
  meditation: '🧘',
  reading: '📚',
  caffeine: '☕',
  food: '🥗'
};

const getHabitIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('water') || lower.includes('hydrat')) return '💧';
  if (lower.includes('protein') || lower.includes('shake')) return '🥩';
  if (lower.includes('sleep')) return '😴';
  if (lower.includes('walk') || lower.includes('run') || lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) return '🏃';
  if (lower.includes('vitamin') || lower.includes('supplement')) return '💊';
  if (lower.includes('caffeine') || lower.includes('coffee')) return '☕';
  if (lower.includes('eating') || lower.includes('sugar') || lower.includes('diet')) return '🥗';
  if (lower.includes('meditat')) return '🧘';
  return '✓';
};

const COLORS = ['#2563eb', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4'];

type HabitCardProps = {
  habit: Habit;
  index: number;
  last7Days: string[];
  logsByHabitDate: Map<string, number>;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (h: Habit) => void;
  onArchiveToggle: (id: string) => Promise<void>;
  onDelete: (h: Habit) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

const HabitCard = ({
  habit,
  index,
  last7Days,
  logsByHabitDate,
  isFirst,
  isLast,
  onEdit,
  onArchiveToggle,
  onDelete,
  onMoveUp,
  onMoveDown
}: HabitCardProps): JSX.Element => {
  const [expanded, setExpanded] = useState(true);
  const [checked, setChecked] = useState(false);
  const color = COLORS[index % COLORS.length];
  const icon = getHabitIcon(habit.name);
  const today = toIsoDate(new Date());
  const todayValue = logsByHabitDate.get(`${habit.id}:${today}`);
  const isTodayDone = todayValue !== undefined && todayValue > 0;

  return (
    <div className="card">
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isTodayDone}
          onClick={() => setChecked((c) => !c)}
          style={{
            width: 20, height: 20,
            borderRadius: 'var(--radius-sm)',
            border: `2px solid ${isTodayDone ? 'var(--primary)' : 'var(--border-card)'}`,
            background: isTodayDone ? 'var(--primary)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background var(--transition), border-color var(--transition)'
          }}
        >
          {isTodayDone && (
            <svg viewBox="0 0 12 12" width={10} height={10} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
              <path d="M2 6l3 3 5-5" />
            </svg>
          )}
        </button>

        {/* Icon */}
        <div
          style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-lg)',
            background: `${color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0
          }}
        >
          {icon}
        </div>

        {/* Name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {habit.name}
          </div>
        </div>

        {/* Chevron */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            width: 32, height: 32,
            borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'transparent',
            cursor: 'pointer', color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '↑' : '↓'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 14 }}>
          {/* Goal */}
          {habit.targetValue !== null && habit.targetValue !== undefined && (
            <p className="body" style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              Goal: {habit.targetDirection === 'at_most' ? 'At most' : 'At least'} {habit.targetValue}{habit.unitLabel ? ` ${habit.unitLabel}` : ''}
            </p>
          )}

          {/* 7-day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {last7Days.map((date, di) => {
              const val = logsByHabitDate.get(`${habit.id}:${date}`);
              const isDone = val !== undefined && val > 0;
              const isFuture = date > today;
              const dayIdx = (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7; // 0=Mon
              const dayLabel = DAY_LABELS[dayIdx] ?? DAY_LABELS[di];

              return (
                <div key={date} style={{ textAlign: 'center' }}>
                  <div className="overline" style={{ fontSize: 9, marginBottom: 4 }}>{dayLabel}</div>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      minWidth: 28,
                      minHeight: 28,
                      maxWidth: 36,
                      margin: '0 auto',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: isFuture
                        ? 'var(--surface-container-low)'
                        : isDone
                          ? 'var(--success-bg)'
                          : 'var(--surface-container-low)',
                      color: isFuture
                        ? 'var(--text-tertiary)'
                        : isDone
                          ? 'var(--success-text)'
                          : 'var(--text-tertiary)'
                    }}
                  >
                    {isFuture ? '—' : isDone ? '✓' : '✗'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12, minHeight: 36 }}
              onClick={() => onEdit(habit)}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: 12, minHeight: 36 }}
              onClick={() => void onArchiveToggle(habit.id)}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              Archive
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{
                padding: '8px 14px', fontSize: 12, minHeight: 36,
                color: 'var(--danger)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)';
              }}
              onClick={() => onDelete(habit)}
            >
              <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Delete
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 10px', fontSize: 12, minHeight: 36 }}
              disabled={isFirst}
              onClick={onMoveUp}
              aria-label="Move up"
            >↑</button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 10px', fontSize: 12, minHeight: 36 }}
              disabled={isLast}
              onClick={onMoveDown}
              aria-label="Move down"
            >↓</button>
          </div>
        </div>
      )}
    </div>
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
    mutationFn: async (habitId: string) => { await habitsApi.delete(habitId); },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['habits'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-logs'] })
      ]);
      setDeletingHabit(null);
      setToastMessage('Habit deleted');
    },
    onError: () => setPageError('Unable to delete habit right now. Please try again.')
  });

  // Load last 7 days of habit logs for the 7-day tracker grid
  const last7Days = useMemo(() => getLast7Days(), []);
  const startDate = last7Days[0];
  const endDate = last7Days[last7Days.length - 1];

  const habitLogsQuery = useQuery({
    queryKey: ['habit-logs-week', startDate, endDate],
    queryFn: async () => (await habitLogsApi.list({ startDate, endDate })).data,
    enabled: last7Days.length > 0
  });

  const logsByHabitDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of habitLogsQuery.data ?? []) {
      map.set(`${log.habitId}:${log.logDate}`, Number(log.value ?? 0));
    }
    return map;
  }, [habitLogsQuery.data]);

  const sortedHabits = useMemo(() => [...habits].sort((a, b) => a.displayOrder - b.displayOrder), [habits]);
  const activeHabits = useMemo(() => sortedHabits.filter((h) => h.isActive), [sortedHabits]);
  const archivedHabits = useMemo(() => sortedHabits.filter((h) => !h.isActive), [sortedHabits]);

  useEffect(() => {
    setLocalActiveHabits((current) => {
      const currIds = current.map((h) => h.id);
      const nextIds = activeHabits.map((h) => h.id);
      if (currIds.length === nextIds.length && currIds.every((id, i) => id === nextIds[i])) return current;
      return activeHabits;
    });
  }, [activeHabits]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const handleOpenCreate = () => { setPageError(null); setEditingHabit(null); setIsModalOpen(true); };
  const handleOpenEdit = (h: Habit) => { setPageError(null); setEditingHabit(h); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingHabit(null); };
  const handleOpenDelete = (h: Habit) => { setPageError(null); setDeletingHabit(h); };
  const handleCloseDelete = () => { if (deleteHabitMutation.isPending) return; setDeletingHabit(null); };

  const initialFormValues = useMemo<Partial<CreateHabitInput> | undefined>(() => {
    if (!editingHabit) return undefined;
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
    if (editingHabit) await updateHabit.mutateAsync(payload);
    else await createHabit.mutateAsync(payload);
    handleCloseModal();
  };

  const handleArchiveToggle = async (habitId: string) => {
    setPageError(null);
    try { await archiveHabit.mutateAsync(habitId); }
    catch { setPageError('Unable to update habit status. Please try again.'); }
  };

  const handleMove = async (index: number, dir: 'up' | 'down') => {
    const ti = dir === 'up' ? index - 1 : index + 1;
    if (ti < 0 || ti >= localActiveHabits.length) return;
    const prev = localActiveHabits;
    const reordered = [...localActiveHabits];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(ti, 0, removed);
    setLocalActiveHabits(reordered);
    setPageError(null);
    try { await reorderHabits.mutateAsync(reordered.map((h) => h.id)); }
    catch { setLocalActiveHabits(prev); setPageError('Unable to reorder habits. Please try again.'); }
  };

  const isFormSaving = createHabit.isPending || updateHabit.isPending;

  return (
    <div className="page-container">
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 60,
            background: 'var(--success-bg)', color: 'var(--success-text)',
            borderRadius: 'var(--radius-md)', padding: '8px 16px',
            fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-float)'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Page header */}
      <div
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}
        className="flex-col gap-3 md:!flex-row md:!items-center"
      >
        <div>
          <span className="page-eyebrow">Performance Engineering</span>
          <h1 className="headline">Habits</h1>
        </div>
        <button type="button" className="btn-primary" onClick={handleOpenCreate}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Habit
        </button>
      </div>

      {pageError && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{pageError}</p>
      )}

      {/* Active habits grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: 14 }}>
          Loading habits...
        </div>
      ) : localActiveHabits.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>No active habits yet. Create your first habit!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:!grid-cols-2">
          {localActiveHabits.map((habit, i) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              index={i}
              last7Days={last7Days}
              logsByHabitDate={logsByHabitDate}
              isFirst={i === 0}
              isLast={i === localActiveHabits.length - 1}
              onEdit={handleOpenEdit}
              onArchiveToggle={handleArchiveToggle}
              onDelete={handleOpenDelete}
              onMoveUp={() => void handleMove(i, 'up')}
              onMoveDown={() => void handleMove(i, 'down')}
            />
          ))}
        </div>
      )}

      {/* Archived section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, cursor: 'pointer' }}
          onClick={() => setArchivedOpen((o) => !o)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {archivedOpen ? '∨' : '>'} Archived Habits ({archivedHabits.length})
            </span>
          </div>
          <span className="overline">Historical Data</span>
        </div>

        {archivedOpen && archivedHabits.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {archivedHabits.map((habit) => (
              <div
                key={habit.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: 'var(--surface-container)',
                  borderRadius: 'var(--radius-lg)',
                  opacity: 0.7
                }}
              >
                <span style={{ fontSize: 16 }}>{getHabitIcon(habit.name)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{habit.name}</div>
                </div>
                <button
                  type="button"
                  title="Restore"
                  onClick={() => void handleArchiveToggle(habit.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-tertiary)', padding: 4
                  }}
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M1 4v6h6" />
                    <path d="M23 20v-6h-6" />
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => handleOpenDelete(habit)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--danger)', padding: 4
                  }}
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New/Edit Habit Modal */}
      <CommonModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingHabit ? 'Edit Habit' : 'New Habit'}
        maxWidth={520}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button
              type="button"
              form="habit-form"
              className="btn-primary"
              disabled={isFormSaving}
            >
              {isFormSaving ? 'Saving...' : 'Save Habit'}
            </button>
          </>
        }
      >
        <HabitForm
          initialValues={initialFormValues}
          isSubmitting={isFormSaving}
          submitLabel="Save Habit"
          onCancel={handleCloseModal}
          onSubmit={handleSaveHabit}
        />
      </CommonModal>

      {/* Delete Modal */}
      <CommonModal
        isOpen={Boolean(deletingHabit)}
        onClose={handleCloseDelete}
        title="Delete Habit"
        maxWidth={400}
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseDelete}
              disabled={deleteHabitMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={deleteHabitMutation.isPending}
              onClick={() => {
                if (!deletingHabit) return;
                void deleteHabitMutation.mutateAsync(deletingHabit.id);
              }}
            >
              {deleteHabitMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--warning-bg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: 24
            }}
          >
            ⚠️
          </div>
          <p className="body" style={{ color: 'var(--text-secondary)' }}>
            {deletingHabit
              ? `This will permanently delete "${deletingHabit.name}" and all its logged history. This cannot be undone.`
              : ''}
          </p>
        </div>
      </CommonModal>
    </div>
  );
};

export default HabitsPage;
