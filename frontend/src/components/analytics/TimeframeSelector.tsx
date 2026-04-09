import { useEffect, useState } from 'react';

type Props = {
  onRangeChange: (startDate: string, endDate: string) => void;
};

type ViewType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

function getUTCToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekRange(anchor: Date): { start: Date; end: Date } {
  const day = (anchor.getUTCDay() + 6) % 7;
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() - day);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function getMonthRange(anchor: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  return { start, end };
}

function getQuarterRange(anchor: Date): { start: Date; end: Date } {
  const q = Math.floor(anchor.getUTCMonth() / 3);
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), q * 3 + 3, 0));
  return { start, end };
}

function getYearRange(anchor: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), 12, 0));
  return { start, end };
}

function getRange(view: ViewType, anchor: Date): { start: Date; end: Date } {
  switch (view) {
    case 'weekly': return getWeekRange(anchor);
    case 'monthly': return getMonthRange(anchor);
    case 'quarterly': return getQuarterRange(anchor);
    case 'yearly': return getYearRange(anchor);
  }
}

function shiftAnchorBack(view: ViewType, anchor: Date): Date {
  const d = new Date(anchor);
  switch (view) {
    case 'weekly': d.setUTCDate(d.getUTCDate() - 7); break;
    case 'monthly': d.setUTCMonth(d.getUTCMonth() - 1); break;
    case 'quarterly': d.setUTCMonth(d.getUTCMonth() - 3); break;
    case 'yearly': d.setUTCFullYear(d.getUTCFullYear() - 1); break;
  }
  return d;
}

function shiftAnchorForward(view: ViewType, anchor: Date): Date {
  const d = new Date(anchor);
  switch (view) {
    case 'weekly': d.setUTCDate(d.getUTCDate() + 7); break;
    case 'monthly': d.setUTCMonth(d.getUTCMonth() + 1); break;
    case 'quarterly': d.setUTCMonth(d.getUTCMonth() + 3); break;
    case 'yearly': d.setUTCFullYear(d.getUTCFullYear() + 1); break;
  }
  return d;
}

function getRangeLabel(view: ViewType, start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  switch (view) {
    case 'weekly':
      return `${start.getUTCDate()} ${months[start.getUTCMonth()]} – ${end.getUTCDate()} ${months[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
    case 'monthly':
      return `${months[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    case 'quarterly': {
      const q = Math.floor(start.getUTCMonth() / 3) + 1;
      return `Q${q} ${start.getUTCFullYear()}`;
    }
    case 'yearly':
      return `${start.getUTCFullYear()}`;
  }
}

const TimeframeSelector = ({ onRangeChange }: Props): JSX.Element => {
  const [view, setView] = useState<ViewType>('weekly');
  const [anchor, setAnchor] = useState<Date>(() => getUTCToday());

  const { start, end } = getRange(view, anchor);
  const today = getUTCToday();
  const isNextDisabled = end >= today;
  const rangeLabel = getRangeLabel(view, start, end);

  useEffect(() => {
    const { start: s, end: e } = getRange(view, anchor);
    onRangeChange(toDateString(s), toDateString(e));
  }, [view, anchor]);

  function handleViewChange(v: ViewType) { setView(v); setAnchor(getUTCToday()); }
  function handlePrev() { setAnchor((p) => shiftAnchorBack(view, p)); }
  function handleNext() { if (!isNextDisabled) setAnchor((p) => shiftAnchorForward(view, p)); }

  const views: ViewType[] = ['weekly', 'monthly', 'quarterly'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {/* Pill segmented control */}
      <div
        style={{
          display: 'flex',
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-md)',
          padding: 3,
          gap: 2
        }}
      >
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => handleViewChange(v)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              background: view === v ? 'var(--primary)' : 'transparent',
              color: view === v ? '#ffffff' : 'var(--text-secondary)',
              transition: 'background var(--transition), color var(--transition)',
              whiteSpace: 'nowrap'
            }}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Arrow nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 12px', minHeight: 36 }}
          onClick={handlePrev}
          aria-label="Previous period"
        >
          ‹
        </button>
        <span
          style={{
            minWidth: 160,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            padding: '0 4px'
          }}
        >
          {rangeLabel}
        </span>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '8px 12px', minHeight: 36, opacity: isNextDisabled ? 0.4 : 1 }}
          onClick={handleNext}
          disabled={isNextDisabled}
          aria-label="Next period"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default TimeframeSelector;
