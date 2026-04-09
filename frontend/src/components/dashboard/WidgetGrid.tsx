import { useCallback, useMemo, useState } from 'react';

import type { DashboardWidgetLayout } from '../../types';
import CommonModal from '../common/Modal';
import CalorieCard, { type CalorieCardProps } from './CalorieCard';
import HabitStreakWidget, { type HabitStreakWidgetProps } from './HabitStreakWidget';
import MacroDonut, { type MacroDonutProps } from './MacroDonut';
import WaterRing, { type WaterRingProps } from './WaterRing';
import WeightSparkline, { type WeightSparklineProps } from './WeightSparkline';

type WidgetId = 'calories-today' | 'weight-trend' | 'macro-donut' | 'water-ring' | 'habit-streaks';

type WidgetOption = { id: WidgetId; label: string; defaultSize: DashboardWidgetLayout['size'] };

const WIDGET_OPTIONS: WidgetOption[] = [
  { id: 'calories-today', label: 'Calories Today', defaultSize: 'large' },
  { id: 'weight-trend', label: 'Weight Progression', defaultSize: 'medium' },
  { id: 'macro-donut', label: 'Macro Split', defaultSize: 'medium' },
  { id: 'water-ring', label: 'Hydration', defaultSize: 'small' },
  { id: 'habit-streaks', label: 'Performance Habits', defaultSize: 'medium' }
];

const WIDGET_IDS = new Set<WidgetId>(WIDGET_OPTIONS.map((o) => o.id));
const WIDGET_OPTION_MAP = new Map(WIDGET_OPTIONS.map((o) => [o.id, o]));

type EditableRow = { widgetId: WidgetId; label: string; size: DashboardWidgetLayout['size']; included: boolean };

const normalizeLayout = (layout: DashboardWidgetLayout[] | undefined): DashboardWidgetLayout[] => {
  if (!layout) return [];
  const unique: DashboardWidgetLayout[] = [];
  const seen = new Set<string>();
  for (const item of [...layout].sort((a, b) => a.position - b.position)) {
    if (!WIDGET_IDS.has(item.widgetId as WidgetId) || seen.has(item.widgetId)) continue;
    seen.add(item.widgetId);
    unique.push(item);
  }
  return unique.map((item, index) => ({ ...item, position: index }));
};

const buildRows = (layout: DashboardWidgetLayout[] | undefined): EditableRow[] => {
  const normalized = normalizeLayout(layout);
  const includedIds = new Set(normalized.map((i) => i.widgetId as WidgetId));
  const rows: EditableRow[] = normalized
    .map((item) => {
      const opt = WIDGET_OPTION_MAP.get(item.widgetId as WidgetId);
      if (!opt) return null;
      return { widgetId: opt.id, label: opt.label, size: item.size, included: true };
    })
    .filter((r): r is EditableRow => r !== null);
  for (const opt of WIDGET_OPTIONS) {
    if (!includedIds.has(opt.id)) {
      rows.push({ widgetId: opt.id, label: opt.label, size: opt.defaultSize, included: false });
    }
  }
  return rows;
};

export type WidgetGridProps = {
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
  const [modalOpen, setModalOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openModal = () => { setDraftRows(buildRows(layout)); setSaveError(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setDraftRows([]); setSaveError(null); };

  const toggle = (id: WidgetId) => setDraftRows((r) => r.map((row) => row.widgetId === id ? { ...row, included: !row.included } : row));

  const moveRow = (index: number, dir: 'up' | 'down') => {
    const ti = dir === 'up' ? index - 1 : index + 1;
    if (ti < 0 || ti >= draftRows.length) return;
    setDraftRows((r) => { const n = [...r]; [n[index], n[ti]] = [n[ti], n[index]]; return n; });
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    const payload: DashboardWidgetLayout[] = draftRows
      .filter((r) => r.included)
      .map((r, i) => ({ widgetId: r.widgetId, size: r.size, position: i }));
    try { await onSaveLayout(payload); closeModal(); }
    catch { setSaveError('Unable to save widget layout right now.'); }
    finally { setSaving(false); }
  };

  const renderWidget = useCallback((id: string) => {
    switch (id as WidgetId) {
      case 'calories-today': return <CalorieCard {...calorieCardProps} />;
      case 'weight-trend': return <WeightSparkline {...weightSparklineProps} />;
      case 'macro-donut': return <MacroDonut {...macroDonutProps} />;
      case 'water-ring': return <WaterRing {...waterRingProps} />;
      case 'habit-streaks': return <HabitStreakWidget {...habitStreakWidgetProps} />;
      default: return null;
    }
  }, [calorieCardProps, weightSparklineProps, macroDonutProps, waterRingProps, habitStreakWidgetProps]);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span className="title">Widgets</span>
        <button
          type="button"
          aria-label="Customise widgets"
          onClick={openModal}
          disabled={isLoadingLayout && !layout}
          style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)',
            transition: 'background var(--transition)'
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div
        style={{
          columnCount: 1,
          columnGap: 20
        }}
        className="sm:!columns-2"
      >
        {(isLoadingLayout && normalizedLayout.length === 0)
          ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ breakInside: 'avoid', marginBottom: 20, background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)', height: 180 }} />
          ))
          : normalizedLayout.map((item) => (
            <div key={item.widgetId} style={{ breakInside: 'avoid', marginBottom: 20 }}>
              {renderWidget(item.widgetId)}
            </div>
          ))
        }
      </div>

      {/* Manage modal */}
      <CommonModal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Customise Widgets"
        maxWidth={480}
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {draftRows.map((row, i) => (
            <div
              key={row.widgetId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={row.included}
                  onClick={() => toggle(row.widgetId)}
                  className={`toggle ${row.included ? 'on' : ''}`}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{row.label}</span>
              </label>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveRow(i, 'up')}
                  style={{
                    width: 32, height: 32,
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-card)',
                    background: 'var(--surface-container-low)',
                    cursor: i === 0 ? 'not-allowed' : 'pointer',
                    opacity: i === 0 ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)'
                  }}
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === draftRows.length - 1}
                  onClick={() => moveRow(i, 'down')}
                  style={{
                    width: 32, height: 32,
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-card)',
                    background: 'var(--surface-container-low)',
                    cursor: i === draftRows.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: i === draftRows.length - 1 ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)'
                  }}
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
          {saveError ? <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{saveError}</p> : null}
        </div>
      </CommonModal>
    </section>
  );
};

export default WidgetGrid;
