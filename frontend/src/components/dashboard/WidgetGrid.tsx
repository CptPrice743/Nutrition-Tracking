import { useCallback, useMemo, useState } from 'react';

import type { DashboardWidgetLayout } from '../../types';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import CalorieCard, { type CalorieCardProps } from './CalorieCard';
import HabitStreakWidget, { type HabitStreakWidgetProps } from './HabitStreakWidget';
import MacroDonut, { type MacroDonutProps } from './MacroDonut';
import WaterRing, { type WaterRingProps } from './WaterRing';
import WeightSparkline, { type WeightSparklineProps } from './WeightSparkline';

type WidgetId =
  | 'calories-today'
  | 'weight-trend'
  | 'macro-donut'
  | 'water-ring'
  | 'habit-streaks';

type WidgetOption = {
  id: WidgetId;
  label: string;
  defaultSize: DashboardWidgetLayout['size'];
};

const WIDGET_OPTIONS: WidgetOption[] = [
  { id: 'calories-today', label: 'Calories Today', defaultSize: 'large' },
  { id: 'weight-trend', label: 'Weight Trend', defaultSize: 'medium' },
  { id: 'macro-donut', label: 'Macro Donut', defaultSize: 'medium' },
  { id: 'water-ring', label: 'Water Ring', defaultSize: 'small' },
  { id: 'habit-streaks', label: 'Habit Streaks', defaultSize: 'medium' }
];

const WIDGET_IDS = new Set<WidgetId>(WIDGET_OPTIONS.map((option) => option.id));
const WIDGET_OPTION_MAP = new Map(WIDGET_OPTIONS.map((option) => [option.id, option]));

type EditableWidgetRow = {
  widgetId: WidgetId;
  label: string;
  size: DashboardWidgetLayout['size'];
  included: boolean;
};

const normalizeLayout = (layout: DashboardWidgetLayout[] | undefined): DashboardWidgetLayout[] => {
  if (!layout) {
    return [];
  }

  const unique: DashboardWidgetLayout[] = [];
  const seen = new Set<string>();

  for (const item of [...layout].sort((a, b) => a.position - b.position)) {
    if (!WIDGET_IDS.has(item.widgetId as WidgetId) || seen.has(item.widgetId)) {
      continue;
    }

    seen.add(item.widgetId);
    unique.push(item);
  }

  return unique.map((item, index) => ({ ...item, position: index }));
};

const buildEditableRows = (layout: DashboardWidgetLayout[] | undefined): EditableWidgetRow[] => {
  const includedLayout = normalizeLayout(layout);
  const includedIds = new Set(includedLayout.map((item) => item.widgetId as WidgetId));

  const rows: EditableWidgetRow[] = includedLayout
    .map((item) => {
      const option = WIDGET_OPTION_MAP.get(item.widgetId as WidgetId);
      if (!option) {
        return null;
      }

      return {
        widgetId: option.id,
        label: option.label,
        size: item.size,
        included: true
      };
    })
    .filter((row): row is EditableWidgetRow => row !== null);

  for (const option of WIDGET_OPTIONS) {
    if (includedIds.has(option.id)) {
      continue;
    }

    rows.push({
      widgetId: option.id,
      label: option.label,
      size: option.defaultSize,
      included: false
    });
  }

  return rows;
};

type WidgetGridProps = {
  layout: DashboardWidgetLayout[] | undefined;
  isLoadingLayout: boolean;
  onSaveLayout: (layoutJson: DashboardWidgetLayout[]) => Promise<void>;
  calorieCardProps: CalorieCardProps;
  weightSparklineProps: WeightSparklineProps;
  macroDonutProps: MacroDonutProps;
  waterRingProps: WaterRingProps;
  habitStreakWidgetProps: HabitStreakWidgetProps;
};

const WidgetGrid = ({
  layout,
  isLoadingLayout,
  onSaveLayout,
  calorieCardProps,
  weightSparklineProps,
  macroDonutProps,
  waterRingProps,
  habitStreakWidgetProps
}: WidgetGridProps): JSX.Element => {
  const normalizedLayout = useMemo(() => normalizeLayout(layout), [layout]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<EditableWidgetRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openManageModal = () => {
    setDraftRows(buildEditableRows(layout));
    setSaveError(null);
    setIsModalOpen(true);
  };

  const closeManageModal = () => {
    setIsModalOpen(false);
    setDraftRows([]);
    setSaveError(null);
  };

  const toggleIncluded = (widgetId: WidgetId) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.widgetId === widgetId ? { ...row, included: !row.included } : row
      )
    );
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftRows.length) {
      return;
    }

    setDraftRows((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const payload: DashboardWidgetLayout[] = draftRows
      .filter((row) => row.included)
      .map((row, index) => ({
        widgetId: row.widgetId,
        size: row.size,
        position: index
      }));

    try {
      await onSaveLayout(payload);
      closeManageModal();
    } catch {
      setSaveError('Unable to save widget layout right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderWidget = useCallback(
    (widgetId: string) => {
      switch (widgetId as WidgetId) {
        case 'calories-today':
          return <CalorieCard {...calorieCardProps} />;
        case 'weight-trend':
          return <WeightSparkline {...weightSparklineProps} />;
        case 'macro-donut':
          return <MacroDonut {...macroDonutProps} />;
        case 'water-ring':
          return <WaterRing {...waterRingProps} />;
        case 'habit-streaks':
          return <HabitStreakWidget {...habitStreakWidgetProps} />;
        default:
          return null;
      }
    },
    [
      calorieCardProps,
      habitStreakWidgetProps,
      macroDonutProps,
      waterRingProps,
      weightSparklineProps
    ]
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Widget Grid</h2>
        <button
          type="button"
          aria-label="Manage widgets"
          onClick={openManageModal}
          disabled={isLoadingLayout && !layout}
          className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10.325 4.317a1 1 0 0 1 1.35-.936l.326.13a1 1 0 0 0 .998-.134l.278-.208a1 1 0 0 1 1.412.197l.794 1.06a1 1 0 0 0 .95.384l.34-.057a1 1 0 0 1 1.143.89l.147 1.315a1 1 0 0 0 .698.85l.32.106a1 1 0 0 1 .636 1.273l-.417 1.214a1 1 0 0 0 .194 1.02l.224.26a1 1 0 0 1-.09 1.41l-.974.86a1 1 0 0 0-.307.991l.074.336a1 1 0 0 1-.79 1.216l-1.287.252a1 1 0 0 0-.772.7l-.115.318a1 1 0 0 1-1.292.594l-1.192-.474a1 1 0 0 0-1.035.17l-.258.229a1 1 0 0 1-1.414-.057l-.889-.942a1 1 0 0 0-.983-.29l-.337.072a1 1 0 0 1-1.218-.786l-.257-1.286a1 1 0 0 0-.704-.77l-.318-.114a1 1 0 0 1-.596-1.292l.472-1.192a1 1 0 0 0-.17-1.034l-.228-.258a1 1 0 0 1 .056-1.414l.941-.889a1 1 0 0 0 .289-.982l-.071-.337a1 1 0 0 1 .785-1.218l1.287-.258a1 1 0 0 0 .77-.704l.114-.318a1 1 0 0 1 .595-.596z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>

      {isLoadingLayout && normalizedLayout.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {normalizedLayout.map((item) => (
            <div key={item.widgetId}>{renderWidget(item.widgetId)}</div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeManageModal}
        title="Manage Widgets"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeManageModal}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} loading={isSaving}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {draftRows.map((row, index) => (
            <div
              key={row.widgetId}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
            >
              <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={() => {
                    toggleIncluded(row.widgetId);
                  }}
                  className="h-4 w-4 accent-accent-600"
                />
                <span>{row.label}</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Move ${row.label} up`}
                  disabled={index === 0}
                  onClick={() => {
                    moveRow(index, 'up');
                  }}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${row.label} down`}
                  disabled={index === draftRows.length - 1}
                  onClick={() => {
                    moveRow(index, 'down');
                  }}
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}

          {saveError ? <p className="text-sm text-danger">{saveError}</p> : null}
        </div>
      </Modal>
    </section>
  );
};

export default WidgetGrid;
