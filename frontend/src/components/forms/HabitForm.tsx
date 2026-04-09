import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { z } from 'zod';

import type { CreateHabitInput } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';

type HabitFormProps = {
  initialValues?: Partial<CreateHabitInput>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (payload: CreateHabitInput) => Promise<void> | void;
};

type FieldName =
  | 'name'
  | 'habitType'
  | 'unitLabel'
  | 'frequencyType'
  | 'frequencyX'
  | 'frequencyY'
  | 'scheduledDays'
  | 'scheduledDates'
  | 'targetValue'
  | 'targetDirection'
  | 'isCalorieBurning'
  | 'calorieUnit'
  | 'calorieKcal';

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_DATE_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? Number.NaN : parsed;
  }

  if (typeof value === 'number') {
    return value;
  }

  return undefined;
};

const habitFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60, 'Name cannot exceed 60 characters'),
    habitType: z.enum(['count', 'boolean']),
    unitLabel: z.string().trim().max(30, 'Unit label cannot exceed 30 characters').optional(),
    frequencyType: z.enum([
      'daily',
      'weekly',
      'monthly',
      'x_per_week',
      'x_per_month',
      'x_in_y_days'
    ]),
    frequencyX: z.preprocess(
      toOptionalNumber,
      z.number().int('Must be a whole number').positive('Must be greater than 0').optional()
    ),
    frequencyY: z.preprocess(
      toOptionalNumber,
      z.number().int('Must be a whole number').positive('Must be greater than 0').optional()
    ),
    scheduledDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    scheduledDates: z.array(z.number().int().min(1).max(31)).max(31).optional(),
    targetValue: z.preprocess(
      toOptionalNumber,
      z.number().nonnegative('Must be 0 or greater').optional()
    ),
    targetDirection: z.enum(['at_least', 'at_most']).optional(),
    isCalorieBurning: z.boolean().default(false),
    calorieUnit: z.preprocess(
      toOptionalNumber,
      z.number().positive('Must be greater than 0').optional()
    ),
    calorieKcal: z.preprocess(
      toOptionalNumber,
      z.number().positive('Must be greater than 0').optional()
    )
  })
  .superRefine((data, ctx) => {
    if (
      (data.frequencyType === 'x_per_week' ||
        data.frequencyType === 'x_per_month' ||
        data.frequencyType === 'x_in_y_days') &&
      !data.frequencyX
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequencyX'],
        message: 'X is required for this frequency type'
      });
    }

    if (data.frequencyType === 'x_in_y_days' && !data.frequencyY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequencyY'],
        message: 'Y is required for x_in_y_days'
      });
    }

    if (data.habitType === 'count') {
      if (data.targetValue !== undefined && !data.targetDirection) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetDirection'],
          message: 'Goal direction is required when daily target is set'
        });
      }

      if (data.targetDirection && data.targetValue === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['targetValue'],
          message: 'Daily target is required when goal direction is set'
        });
      }
    }

    if (data.isCalorieBurning && (!data.calorieUnit || !data.calorieKcal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isCalorieBurning'],
        message: 'Calorie conversion values are required when calorie burning is enabled'
      });
    }
  });

const HabitForm = ({
  initialValues,
  isSubmitting = false,
  submitLabel = 'Save Habit',
  onCancel,
  onSubmit
}: HabitFormProps): JSX.Element => {
  const [name, setName] = useState('');
  const [habitType, setHabitType] = useState<'count' | 'boolean'>('count');
  const [unitLabel, setUnitLabel] = useState('');
  const [frequencyType, setFrequencyType] = useState<CreateHabitInput['frequencyType']>('daily');
  const [frequencyX, setFrequencyX] = useState('');
  const [frequencyY, setFrequencyY] = useState('');
  const [scheduledDays, setScheduledDays] = useState<number[]>([]);
  const [scheduledDates, setScheduledDates] = useState<number[]>([]);
  const [targetValue, setTargetValue] = useState('');
  const [targetDirection, setTargetDirection] = useState<'at_least' | 'at_most'>('at_least');
  const [isCalorieBurning, setIsCalorieBurning] = useState(false);
  const [calorieUnit, setCalorieUnit] = useState('');
  const [calorieKcal, setCalorieKcal] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  useEffect(() => {
    setName(initialValues?.name ?? '');
    setHabitType(initialValues?.habitType ?? 'count');
    setUnitLabel(initialValues?.unitLabel ?? '');
    setFrequencyType(initialValues?.frequencyType ?? 'daily');
    setFrequencyX(
      initialValues?.frequencyX === undefined || initialValues?.frequencyX === null
        ? ''
        : String(initialValues.frequencyX)
    );
    setFrequencyY(
      initialValues?.frequencyY === undefined || initialValues?.frequencyY === null
        ? ''
        : String(initialValues.frequencyY)
    );
    setScheduledDays(initialValues?.scheduledDays ?? []);
    setScheduledDates(initialValues?.scheduledDates ?? []);
    setTargetValue(
      initialValues?.targetValue === undefined || initialValues?.targetValue === null
        ? ''
        : String(initialValues.targetValue)
    );
    setTargetDirection(initialValues?.targetDirection ?? 'at_least');
    setIsCalorieBurning(Boolean(initialValues?.isCalorieBurning));
    setCalorieUnit(
      initialValues?.calorieUnit === undefined || initialValues?.calorieUnit === null
        ? ''
        : String(initialValues.calorieUnit)
    );
    setCalorieKcal(
      initialValues?.calorieKcal === undefined || initialValues?.calorieKcal === null
        ? ''
        : String(initialValues.calorieKcal)
    );
    setErrors({});
  }, [initialValues]);

  useEffect(() => {
    if (frequencyType !== 'x_per_week' && scheduledDays.length > 0) {
      setScheduledDays([]);
    }

    if (frequencyType !== 'x_per_month' && frequencyType !== 'monthly' && scheduledDates.length > 0) {
      setScheduledDates([]);
    }
  }, [frequencyType, scheduledDates.length, scheduledDays.length]);

  const showFrequencyX =
    frequencyType === 'x_in_y_days';
  const showFrequencyY = frequencyType === 'x_in_y_days';
  const showScheduledDays = frequencyType === 'x_per_week';
  const showScheduledDates = frequencyType === 'x_per_month' || frequencyType === 'monthly';
  const hasSelectedScheduledDays = showScheduledDays && scheduledDays.length > 0;
  const hasSelectedScheduledDates = frequencyType === 'x_per_month' && scheduledDates.length > 0;
  const showManualFrequencyX =
    (frequencyType === 'x_per_week' && !hasSelectedScheduledDays) ||
    (frequencyType === 'x_per_month' && !hasSelectedScheduledDates);
  const showUnitLabel = habitType === 'count';
  const showTargetValue = habitType === 'count';

  const targetValueLabel = useMemo(() => {
    const trimmedUnit = unitLabel.trim();
    if (trimmedUnit) {
      return `Daily target (in ${trimmedUnit})`;
    }
    return 'Daily target';
  }, [unitLabel]);

  const calorieHint = useMemo(() => {
    if (!isCalorieBurning || !calorieUnit.trim() || !calorieKcal.trim()) {
      return 'Example: 1000 steps = 50 kcal';
    }

    const unitText = showUnitLabel && unitLabel.trim() ? unitLabel.trim() : 'units';
    return `${calorieUnit.trim()} ${unitText} = ${calorieKcal.trim()} kcal`;
  }, [isCalorieBurning, calorieKcal, calorieUnit, showUnitLabel, unitLabel]);

  useEffect(() => {
    if (frequencyType === 'x_per_week' && scheduledDays.length > 0) {
      setFrequencyX(String(scheduledDays.length));
      return;
    }

    if (frequencyType === 'x_per_month' && scheduledDates.length > 0) {
      setFrequencyX(String(scheduledDates.length));
      return;
    }

    if (frequencyType === 'daily') {
      setFrequencyX('1');
      return;
    }

    if (frequencyType === 'weekly') {
      setFrequencyX('1');
      return;
    }

    if (frequencyType === 'monthly') {
      setFrequencyX('1');
    }
  }, [frequencyType, scheduledDates.length, scheduledDays.length]);

  const toggleScheduledDay = (dayIndex: number) => {
    setScheduledDays((currentDays) =>
      currentDays.includes(dayIndex)
        ? currentDays.filter((entry) => entry !== dayIndex)
        : [...currentDays, dayIndex].sort((left, right) => left - right)
    );
  };

  const toggleScheduledDate = (dayOfMonth: number) => {
    setScheduledDates((currentDates) =>
      currentDates.includes(dayOfMonth)
        ? currentDates.filter((entry) => entry !== dayOfMonth)
        : [...currentDates, dayOfMonth].sort((left, right) => left - right)
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const parsed = habitFormSchema.safeParse({
      name,
      habitType,
      unitLabel,
      frequencyType,
      frequencyX,
      frequencyY,
      scheduledDays,
      scheduledDates,
      targetValue: habitType === 'count' ? targetValue : undefined,
      targetDirection: habitType === 'count' ? targetDirection || undefined : undefined,
      isCalorieBurning,
      calorieUnit,
      calorieKcal
    });

    if (!parsed.success) {
      const nextErrors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as FieldName | undefined;
        if (path && !nextErrors[path]) {
          nextErrors[path] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    const payload: CreateHabitInput = {
      name: parsed.data.name,
      habitType: parsed.data.habitType,
      frequencyType: parsed.data.frequencyType,
      isCalorieBurning: parsed.data.isCalorieBurning
    };

    if (parsed.data.habitType === 'count' && parsed.data.unitLabel) {
      payload.unitLabel = parsed.data.unitLabel;
    }
    if (parsed.data.frequencyX !== undefined) {
      payload.frequencyX = parsed.data.frequencyX;
    }

    if (parsed.data.frequencyType === 'x_in_y_days' && parsed.data.frequencyY !== undefined) {
      payload.frequencyY = parsed.data.frequencyY;
    }

    payload.scheduledDays = parsed.data.scheduledDays ?? [];
    payload.scheduledDates = parsed.data.scheduledDates ?? [];

    if (parsed.data.targetDirection) {
      payload.targetDirection = parsed.data.targetDirection;
    }

    if (parsed.data.habitType === 'count' && parsed.data.targetValue !== undefined) {
      payload.targetValue = parsed.data.targetValue;
    }

    if (parsed.data.habitType === 'boolean' && parsed.data.targetDirection) {
      payload.targetValue = 1;
    }

    if (parsed.data.isCalorieBurning) {
      payload.calorieUnit = parsed.data.calorieUnit;
      payload.calorieKcal = parsed.data.calorieKcal;
    }

    try {
      await onSubmit(payload);
    } catch {}
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Habit name"
        error={errors.name}
        required
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Type</legend>
        <div className="flex gap-2">
          <label className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm text-slate-700">
            <input
              type="radio"
              name="habitType"
              value="count"
              checked={habitType === 'count'}
              onChange={() => setHabitType('count')}
            />
            Count
          </label>
          <label className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm text-slate-700">
            <input
              type="radio"
              name="habitType"
              value="boolean"
              checked={habitType === 'boolean'}
              onChange={() => setHabitType('boolean')}
            />
            Boolean
          </label>
        </div>
      </fieldset>

      <Select
        label="Frequency Type"
        value={frequencyType}
        options={[
          { value: 'daily', label: 'Every day' },
          { value: 'weekly', label: 'Once a week' },
          { value: 'monthly', label: 'Once a month' },
          { value: 'x_per_week', label: 'X times per week' },
          { value: 'x_per_month', label: 'X times per month' },
          { value: 'x_in_y_days', label: 'X times every Y days' }
        ]}
        onChange={(event) =>
          setFrequencyType(event.target.value as CreateHabitInput['frequencyType'])
        }
        error={errors.frequencyType}
      />

      {showScheduledDays ? (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-slate-700">On which days?</p>
            <p className="text-xs text-gray-400">Optional — leave blank for any days</p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {DAY_OPTIONS.map((dayLabel, dayIndex) => {
              const selected = scheduledDays.includes(dayIndex);
              return (
                <button
                  key={dayLabel}
                  type="button"
                  className={`min-w-[40px] h-[40px] rounded-full text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleScheduledDay(dayIndex)}
                >
                  {dayLabel}
                </button>
              );
            })}
          </div>

          {hasSelectedScheduledDays ? (
            <p className="text-xs text-gray-400">
              Frequency auto-set to {scheduledDays.length} times based on your selection
            </p>
          ) : null}
        </div>
      ) : null}

      {showScheduledDates ? (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-slate-700">On which dates?</p>
            <p className="text-xs text-gray-400">Optional — leave blank for any dates</p>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {MONTH_DATE_OPTIONS.map((dayOfMonth) => {
              const selected = scheduledDates.includes(dayOfMonth);
              return (
                <button
                  key={dayOfMonth}
                  type="button"
                  className={`min-w-[40px] h-[40px] rounded-full text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => toggleScheduledDate(dayOfMonth)}
                >
                  {dayOfMonth}
                </button>
              );
            })}
          </div>

          {hasSelectedScheduledDates ? (
            <p className="text-xs text-gray-400">
              Frequency auto-set to {scheduledDates.length} times based on your selection
            </p>
          ) : null}
        </div>
      ) : null}

      {showManualFrequencyX ? (
        <Input
          label="How many times?"
          type="number"
          min={1}
          max={frequencyType === 'x_per_week' ? 7 : 31}
          step={1}
          value={frequencyX}
          onChange={(event) => setFrequencyX(event.target.value)}
          error={errors.frequencyX}
        />
      ) : null}

      {showFrequencyX ? (
        <div className={showFrequencyY ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
          <Input
            label="Times"
            type="number"
            min={1}
            step={1}
            value={frequencyX}
            onChange={(event) => setFrequencyX(event.target.value)}
            error={errors.frequencyX}
          />

          {showFrequencyY ? (
            <Input
              label="In how many days"
              type="number"
              min={1}
              step={1}
              value={frequencyY}
              onChange={(event) => setFrequencyY(event.target.value)}
              error={errors.frequencyY}
            />
          ) : null}
        </div>
      ) : null}

      {showUnitLabel ? (
        <Input
          label="Unit Label"
          value={unitLabel}
          onChange={(event) => setUnitLabel(event.target.value)}
          placeholder="e.g. steps, glasses"
          error={errors.unitLabel}
        />
      ) : null}

      {showTargetValue ? (
        <Input
          label={targetValueLabel}
          type="number"
          min={0}
          step="0.01"
          value={targetValue}
          onChange={(event) => setTargetValue(event.target.value)}
          error={errors.targetValue}
        />
      ) : null}

      {showTargetValue ? (
        <Select
          label="Goal direction"
          value={targetDirection}
          options={[
            { value: 'at_least', label: 'At least (minimum)' },
            { value: 'at_most', label: 'At most (maximum)' }
          ]}
          onChange={(event) => setTargetDirection(event.target.value as 'at_least' | 'at_most')}
          error={errors.targetDirection}
        />
      ) : null}

      <div className="space-y-2 rounded-xl border border-slate-200 p-3">
        <Toggle
          label="Calorie Burning"
          checked={isCalorieBurning}
          onChange={(checked) => setIsCalorieBurning(checked)}
        />

        {isCalorieBurning ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="N units ="
              type="number"
              min={1}
              step="0.01"
              value={calorieUnit}
              onChange={(event) => setCalorieUnit(event.target.value)}
              error={errors.calorieUnit}
            />
            <Input
              label="M kcal"
              type="number"
              min={1}
              step="0.01"
              value={calorieKcal}
              onChange={(event) => setCalorieKcal(event.target.value)}
              error={errors.calorieKcal}
            />
          </div>
        ) : null}

        {errors.isCalorieBurning ? <p className="text-sm text-danger">{errors.isCalorieBurning}</p> : null}
        <p className="text-xs text-slate-500">{calorieHint}</p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default HabitForm;
