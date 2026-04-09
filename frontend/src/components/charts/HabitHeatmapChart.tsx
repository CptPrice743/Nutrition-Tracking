import { format } from 'date-fns';

import type { HabitPeriodSummary } from '../../types';

type Props = {
  habit: HabitPeriodSummary;
  startDate: string;
  endDate: string;
};

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parseUtcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);
const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];
const addUtcDays = (date: Date, days: number): Date => new Date(date.getTime() + days * MS_PER_DAY);

const isScheduledDay = (habit: HabitPeriodSummary, date: Date): boolean => {
  if (habit.frequencyType === 'daily') {
    return true;
  }

  if (habit.frequencyType === 'x_per_week') {
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    const weekdayIndex = (date.getUTCDay() + 6) % 7;
    return habit.scheduledDays.includes(weekdayIndex);
  }

  if (habit.frequencyType === 'x_per_month') {
    if (!habit.scheduledDates || habit.scheduledDates.length === 0) {
      return true;
    }
    return habit.scheduledDates.includes(date.getUTCDate());
  }

  return true;
};

const HabitHeatmapChart = ({ habit, startDate, endDate }: Props): JSX.Element => {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  const today = parseUtcDate(new Date().toISOString().split('T')[0]);

  if (start.getTime() > end.getTime()) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No data for this period
      </div>
    );
  }

  const startMonday = addUtcDays(start, -((start.getUTCDay() + 6) % 7));
  const endSunday = addUtcDays(end, 6 - ((end.getUTCDay() + 6) % 7));

  const allDates: Date[] = [];
  for (let cursor = new Date(startMonday); cursor.getTime() <= endSunday.getTime(); cursor = addUtcDays(cursor, 1)) {
    allDates.push(new Date(cursor));
  }

  const weekRows: Date[][] = [];
  for (let index = 0; index < allDates.length; index += 7) {
    weekRows.push(allDates.slice(index, index + 7));
  }

  const monthMarkers = new Map<number, string[]>();
  for (let cursor = new Date(start); cursor.getTime() <= end.getTime(); cursor = addUtcDays(cursor, 1)) {
    if (cursor.getUTCDate() === 1) {
      const col = (cursor.getUTCDay() + 6) % 7;
      const current = monthMarkers.get(col) ?? [];
      const label = format(cursor, 'MMM');
      if (!current.includes(label)) {
        monthMarkers.set(col, [...current, label]);
      }
    }
  }

  const valuesByDate = new Map(habit.dailyValues.map((entry) => [entry.date, entry.value]));

  const getCellStyle = (
    date: Date,
    dateString: string
  ): { className: string; title?: string } => {
    const inRange = date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
    if (!inRange) {
      return { className: 'opacity-0 pointer-events-none' };
    }

    const scheduled = isScheduledDay(habit, date);
    const value = valuesByDate.get(dateString) ?? null;

    if (!scheduled) {
      return { className: 'bg-gray-100' };
    }

    if (date.getTime() > today.getTime()) {
      return {
        className: 'bg-gray-200',
        title: `${dateString}\nStatus: Future`
      };
    }

    if (habit.habitType === 'boolean') {
      if (value !== null && Number(value) >= 1) {
        return {
          className: 'bg-green-500',
          title: `${dateString}\nValue: ${Number(value)}\nStatus: Completed`
        };
      }

      return {
        className: 'bg-red-400',
        title: `${dateString}\nValue: ${value === null ? '-' : Number(value)}\nStatus: Missed`
      };
    }

    if (value !== null && Number(value) > 0) {
      if (habit.targetValue !== null && habit.targetValue !== undefined && habit.targetValue > 0) {
        const ratio = Number(value) / Number(habit.targetValue);
        if (ratio < 0.25) {
          return {
            className: 'bg-green-100',
            title: `${dateString}\nValue: ${Number(value)}\nStatus: Logged`
          };
        }
        if (ratio < 0.5) {
          return {
            className: 'bg-green-200',
            title: `${dateString}\nValue: ${Number(value)}\nStatus: Logged`
          };
        }
        if (ratio < 0.75) {
          return {
            className: 'bg-green-300',
            title: `${dateString}\nValue: ${Number(value)}\nStatus: Logged`
          };
        }
        if (ratio < 1) {
          return {
            className: 'bg-green-400',
            title: `${dateString}\nValue: ${Number(value)}\nStatus: Logged`
          };
        }
        return {
          className: 'bg-green-600',
          title: `${dateString}\nValue: ${Number(value)}\nStatus: Completed`
        };
      }

      return {
        className: 'bg-green-400',
        title: `${dateString}\nValue: ${Number(value)}\nStatus: Logged`
      };
    }

    return {
      className: 'bg-red-300',
      title: `${dateString}\nValue: -\nStatus: Missed`
    };
  };

  return (
    <div className="space-y-3 overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 px-1">
        {DAY_HEADERS.map((day, index) => (
          <div key={`${day}-${index}`} className="text-center text-xs text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-1">
        {DAY_HEADERS.map((_, index) => (
          <div key={`month-${index}`} className="text-center text-xs text-gray-500">
            {(monthMarkers.get(index) ?? []).join(' / ')}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {weekRows.map((week, rowIndex) => (
          <div key={`week-${rowIndex}`} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dateString = toIsoDate(date);
              const cell = getCellStyle(date, dateString);

              return (
                <div
                  key={dateString}
                  title={cell.title}
                  className={`h-6 w-6 rounded-sm sm:h-8 sm:w-8 sm:rounded-md ${cell.className}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HabitHeatmapChart;
