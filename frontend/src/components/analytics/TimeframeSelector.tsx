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
  // Always Mon-Sun ISO week
  const day = (anchor.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
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
  const q = Math.floor(anchor.getUTCMonth() / 3); // 0-based quarter
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
    case 'weekly':
      return getWeekRange(anchor);
    case 'monthly':
      return getMonthRange(anchor);
    case 'quarterly':
      return getQuarterRange(anchor);
    case 'yearly':
      return getYearRange(anchor);
  }
}

function shiftAnchorBack(view: ViewType, anchor: Date): Date {
  const d = new Date(anchor);
  switch (view) {
    case 'weekly':
      d.setUTCDate(d.getUTCDate() - 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() - 1);
      break;
    case 'quarterly':
      d.setUTCMonth(d.getUTCMonth() - 3);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      break;
  }
  return d;
}

function shiftAnchorForward(view: ViewType, anchor: Date): Date {
  const d = new Date(anchor);
  switch (view) {
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'quarterly':
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }
  return d;
}

function getRangeLabel(view: ViewType, start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  switch (view) {
    case 'weekly':
      return `${start.getUTCDate()} ${months[start.getUTCMonth()]} - ${end.getUTCDate()} ${months[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
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
    const { start: nextStart, end: nextEnd } = getRange(view, anchor);
    onRangeChange(toDateString(nextStart), toDateString(nextEnd));
  }, [view, anchor]);

  function handleViewChange(newView: ViewType) {
    setView(newView);
    setAnchor(getUTCToday()); // reset anchor to today when switching views
  }

  function handlePrev() {
    setAnchor((prev) => shiftAnchorBack(view, prev));
  }

  function handleNext() {
    if (!isNextDisabled) {
      setAnchor((prev) => shiftAnchorForward(view, prev));
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={view}
          onChange={(e) => handleViewChange(e.target.value as ViewType)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label="Previous period"
            type="button"
          >
            {'\u2039'}
          </button>

          <span className="min-w-[180px] text-center text-sm font-medium text-gray-700 px-2">
            {rangeLabel}
          </span>

          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent-500 ${
              isNextDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            aria-label="Next period"
            type="button"
          >
            {'\u203A'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeframeSelector;
