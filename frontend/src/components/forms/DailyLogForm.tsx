import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { cn } from '../../lib/utils';
import type { CreateDailyLogInput, DailyLog, Habit, HabitLog, DayType } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';

type HabitSavePayload = {
  habitId: string;
  value: number;
  notes?: string;
};

export type DailyLogFormSubmitPayload = {
  logData: CreateDailyLogInput;
  habitLogs: HabitSavePayload[];
};

type DailyLogFormProps = {
  date: string;
  existingLog: DailyLog | null;
  habits: Habit[];
  habitLogs: HabitLog[];
  isSaving: boolean;
  saveError?: string | null;
  onSubmit: (payload: DailyLogFormSubmitPayload) => Promise<void> | void;
};

type HabitDraft = {
  countValue: string;
  booleanValue: boolean | null;
  notes: string;
  notesExpanded: boolean;
};

const toFieldValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const parseOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseOptionalInteger = (value: string): number | undefined => {
  const parsed = parseOptionalNumber(value);
  return parsed === undefined ? undefined : Math.round(parsed);
};

const getTargetText = (habit: Habit): string => {
  if (habit.targetValue === null || habit.targetValue === undefined) {
    return 'Target: Not set';
  }

  const direction = habit.targetDirection === 'at_most' ? '≤' : '≥';
  const unit = habit.unitLabel ? ` ${habit.unitLabel}` : '';
  return `Target: ${direction} ${habit.targetValue}${unit}`;
};

const DailyLogForm = ({
  date,
  existingLog,
  habits,
  habitLogs,
  isSaving,
  saveError,
  onSubmit
}: DailyLogFormProps): JSX.Element => {
  const activeHabits = useMemo(() => habits.filter((habit) => habit.isActive), [habits]);
  const habitLogsById = useMemo(() => {
    return new Map(habitLogs.map((log) => [log.habitId, log]));
  }, [habitLogs]);

  const [fatOpen, setFatOpen] = useState(false);

  const [weightKg, setWeightKg] = useState('');
  const [caloriesConsumed, setCaloriesConsumed] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatTotalG, setFatTotalG] = useState('');
  const [fatSaturatedG, setFatSaturatedG] = useState('');
  const [fatUnsaturatedG, setFatUnsaturatedG] = useState('');
  const [fatTransG, setFatTransG] = useState('');
  const [magnesiumMg, setMagnesiumMg] = useState('');
  const [ironMg, setIronMg] = useState('');
  const [zincMg, setZincMg] = useState('');
  const [waterLitres, setWaterLitres] = useState('');
  const [dayType, setDayType] = useState<DayType | ''>('');
  const [notes, setNotes] = useState('');

  const [habitDrafts, setHabitDrafts] = useState<Record<string, HabitDraft>>({});

  useEffect(() => {
    setWeightKg(toFieldValue(existingLog?.weightKg));
    setCaloriesConsumed(toFieldValue(existingLog?.caloriesConsumed));
    setProteinG(toFieldValue(existingLog?.proteinG));
    setCarbsG(toFieldValue(existingLog?.carbsG));
    setFatTotalG(toFieldValue(existingLog?.fatTotalG));
    setFatSaturatedG(toFieldValue(existingLog?.fatSaturatedG));
    setFatUnsaturatedG(toFieldValue(existingLog?.fatUnsaturatedG));
    setFatTransG(toFieldValue(existingLog?.fatTransG));
    setMagnesiumMg(toFieldValue(existingLog?.magnesiumMg));
    setIronMg(toFieldValue(existingLog?.ironMg));
    setZincMg(toFieldValue(existingLog?.zincMg));
    setWaterLitres(toFieldValue(existingLog?.waterLitres));
    setDayType(existingLog?.dayType ?? '');
    setNotes(existingLog?.notes ?? '');

    const nextDrafts: Record<string, HabitDraft> = {};
    for (const habit of activeHabits) {
      const existingHabitLog = habitLogsById.get(habit.id);

      nextDrafts[habit.id] = {
        countValue:
          habit.habitType === 'count'
            ? toFieldValue(existingHabitLog?.value ?? null)
            : '',
        booleanValue:
          habit.habitType === 'boolean'
            ? existingHabitLog?.value === null || existingHabitLog?.value === undefined
              ? null
              : Number(existingHabitLog.value) > 0
            : null,
        notes: existingHabitLog?.notes ?? '',
        notesExpanded: Boolean(existingHabitLog?.notes)
      };
    }
    setHabitDrafts(nextDrafts);
  }, [activeHabits, existingLog, habitLogsById, date]);

  const totalCaloriesBurned = useMemo(() => {
    return habitLogs.reduce((sum, log) => sum + Number(log.caloriesBurned ?? 0), 0);
  }, [habitLogs]);

  const caloriesConsumedNumber = parseOptionalInteger(caloriesConsumed);
  const netCalories =
    caloriesConsumedNumber !== undefined
      ? Number(caloriesConsumedNumber) - Number(totalCaloriesBurned)
      : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const logData: CreateDailyLogInput = {
      date,
      weightKg: parseOptionalNumber(weightKg),
      caloriesConsumed: parseOptionalInteger(caloriesConsumed),
      proteinG: parseOptionalInteger(proteinG),
      carbsG: parseOptionalInteger(carbsG),
      fatTotalG: parseOptionalInteger(fatTotalG),
      fatSaturatedG: parseOptionalInteger(fatSaturatedG),
      fatUnsaturatedG: parseOptionalInteger(fatUnsaturatedG),
      fatTransG: parseOptionalNumber(fatTransG),
      magnesiumMg: parseOptionalInteger(magnesiumMg),
      ironMg: parseOptionalNumber(ironMg),
      zincMg: parseOptionalNumber(zincMg),
      waterLitres: parseOptionalNumber(waterLitres),
      dayType: dayType || undefined,
      notes: notes.trim() ? notes.trim() : undefined
    };

    const habitPayloads: HabitSavePayload[] = [];
    for (const habit of activeHabits) {
      const draft = habitDrafts[habit.id];
      if (!draft) {
        continue;
      }

      if (habit.habitType === 'count') {
        const value = parseOptionalNumber(draft.countValue);
        if (value !== undefined) {
          habitPayloads.push({
            habitId: habit.id,
            value,
            notes: draft.notes.trim() ? draft.notes.trim() : undefined
          });
        }
      } else if (draft.booleanValue !== null) {
        habitPayloads.push({
          habitId: habit.id,
          value: draft.booleanValue ? 1 : 0,
          notes: draft.notes.trim() ? draft.notes.trim() : undefined
        });
      }
    }

    await onSubmit({
      logData,
      habitLogs: habitPayloads
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Body">
          <div className="space-y-3">
            <Input
              label="Weight"
              unit="kg"
              type="number"
              step="0.01"
              min={0}
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
            />
          </div>
        </Card>

        <Card title="Calories & Macros">
          <div className="space-y-3">
            <Input
              label="Calories Consumed"
              unit="kcal"
              type="number"
              min={0}
              value={caloriesConsumed}
              onChange={(event) => setCaloriesConsumed(event.target.value)}
            />
            <Input
              label="Protein"
              unit="g"
              type="number"
              min={0}
              value={proteinG}
              onChange={(event) => setProteinG(event.target.value)}
            />
            <Input
              label="Carbs"
              unit="g"
              type="number"
              min={0}
              value={carbsG}
              onChange={(event) => setCarbsG(event.target.value)}
            />
            <Input
              label="Fat Total"
              unit="g"
              type="number"
              min={0}
              value={fatTotalG}
              onChange={(event) => setFatTotalG(event.target.value)}
            />

            <button
              type="button"
              className="inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              onClick={() => setFatOpen((open) => !open)}
            >
              {fatOpen ? 'Hide' : 'Show'} Fat Breakdown
            </button>

            {fatOpen ? (
              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <Input
                  label="Saturated Fat"
                  unit="g"
                  type="number"
                  min={0}
                  value={fatSaturatedG}
                  onChange={(event) => setFatSaturatedG(event.target.value)}
                />
                <Input
                  label="Unsaturated Fat"
                  unit="g"
                  type="number"
                  min={0}
                  value={fatUnsaturatedG}
                  onChange={(event) => setFatUnsaturatedG(event.target.value)}
                />
                <Input
                  label="Trans Fat"
                  unit="g"
                  type="number"
                  step="0.01"
                  min={0}
                  value={fatTransG}
                  onChange={(event) => setFatTransG(event.target.value)}
                />
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Micronutrients">
          <div className="space-y-3">
            <Input
              label="Magnesium"
              unit="mg"
              type="number"
              min={0}
              value={magnesiumMg}
              onChange={(event) => setMagnesiumMg(event.target.value)}
            />
            <Input
              label="Iron"
              unit="mg"
              type="number"
              step="0.01"
              min={0}
              value={ironMg}
              onChange={(event) => setIronMg(event.target.value)}
            />
            <Input
              label="Zinc"
              unit="mg"
              type="number"
              step="0.01"
              min={0}
              value={zincMg}
              onChange={(event) => setZincMg(event.target.value)}
            />
          </div>
        </Card>

        <Card title="Lifestyle">
          <div className="space-y-3">
            <Input
              label="Water"
              unit="L"
              type="number"
              step="0.01"
              min={0}
              value={waterLitres}
              onChange={(event) => setWaterLitres(event.target.value)}
            />
            <Select
              label="Day Type"
              value={dayType}
              onChange={(event) => setDayType(event.target.value as DayType | '')}
              options={[
                { value: '', label: 'Select type' },
                { value: 'normal', label: 'Normal' },
                { value: 'restaurant', label: 'Restaurant' }
              ]}
            />
            <Input
              label="Notes"
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </Card>
      </div>

      <Card className="bg-slate-50" title="Calculated Read-Only">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Calories Burned Today</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{totalCaloriesBurned.toFixed(0)} kcal</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Net Calories</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {netCalories === null ? '--' : `${netCalories.toFixed(0)} kcal`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Deficit / Surplus</p>
            <p
              className={cn(
                'mt-1 text-xl font-semibold',
                netCalories === null
                  ? 'text-slate-700'
                  : netCalories < 0
                    ? 'text-success'
                    : netCalories > 0
                      ? 'text-danger'
                      : 'text-slate-700'
              )}
            >
              {netCalories === null
                ? '--'
                : `${netCalories < 0 ? 'Deficit' : netCalories > 0 ? 'Surplus' : 'Balanced'} (${Math.abs(
                    netCalories
                  ).toFixed(0)} kcal)`}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Today's Habits">
        <div className="space-y-4">
          {activeHabits.map((habit) => {
            const draft = habitDrafts[habit.id] ?? {
              countValue: '',
              booleanValue: null,
              notes: '',
              notesExpanded: false
            };

            return (
              <div key={habit.id} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{habit.name}</p>
                    <p className="text-sm text-slate-500">{getTargetText(habit)}</p>
                  </div>
                  <Badge variant="neutral">{habit.habitType}</Badge>
                </div>

                {habit.habitType === 'count' ? (
                  <Input
                    label={`${habit.name} value`}
                    unit={habit.unitLabel ?? undefined}
                    type="number"
                    min={0}
                    value={draft.countValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setHabitDrafts((current) => ({
                        ...current,
                        [habit.id]: {
                          ...draft,
                          countValue: value
                        }
                      }));
                    }}
                  />
                ) : (
                  <Toggle
                    label="Completed"
                    checked={draft.booleanValue ?? false}
                    onChange={(checked) => {
                      setHabitDrafts((current) => ({
                        ...current,
                        [habit.id]: {
                          ...draft,
                          booleanValue: checked
                        }
                      }));
                    }}
                  />
                )}

                <button
                  type="button"
                  className="mt-3 inline-flex min-h-[44px] min-w-[44px] items-center text-sm font-medium text-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  onClick={() => {
                    setHabitDrafts((current) => ({
                      ...current,
                      [habit.id]: {
                        ...draft,
                        notesExpanded: !draft.notesExpanded
                      }
                    }));
                  }}
                >
                  {draft.notesExpanded ? 'Hide notes' : 'Add notes'}
                </button>

                {draft.notesExpanded ? (
                  <div className="mt-2">
                    <Input
                      label="Notes"
                      type="text"
                      value={draft.notes}
                      onChange={(event) => {
                        const value = event.target.value;
                        setHabitDrafts((current) => ({
                          ...current,
                          [habit.id]: {
                            ...draft,
                            notes: value
                          }
                        }));
                      }}
                      placeholder="Optional notes"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          {activeHabits.length === 0 ? (
            <p className="text-sm text-slate-500">No active habits yet. Create a habit to start tracking.</p>
          ) : null}
        </div>
      </Card>

      {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}

      <Button type="submit" className="w-full md:w-auto" loading={isSaving}>
        Save Log
      </Button>
    </form>
  );
};

export default DailyLogForm;
