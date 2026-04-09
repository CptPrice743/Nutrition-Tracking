import { useEffect, useRef, useState } from 'react';

import HabitTab from '../components/analytics/HabitTab';
import NutritionTab from '../components/analytics/NutritionTab';
import TimeframeSelector from '../components/analytics/TimeframeSelector';
import { useAnalytics } from '../hooks/useAnalytics';

const SWIPE_THRESHOLD = 50;

const AnalyticsPage = (): JSX.Element => {
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  const [activeTab, setActiveTab] = useState<'diet' | 'habits'>('diet');
  const touchStartXRef = useRef<number | null>(null);
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  function handleRangeChange(startDate: string, endDate: string) {
    setDateRange({ startDate, endDate });
  }

  const { data, isLoading } = useAnalytics(
    dateRange.startDate && dateRange.endDate
      ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
      : { startDate: '', endDate: '' }
  );

  useEffect(() => {
    const node = tabContentRef.current;
    if (!node) {
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startX = touchStartXRef.current;
      touchStartXRef.current = null;

      if (startX === null) {
        return;
      }

      const endX = event.changedTouches[0]?.clientX ?? startX;
      const deltaX = startX - endX;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
        return;
      }

      if (deltaX > 0) {
        setActiveTab((current) => (current === 'diet' ? 'habits' : current));
      } else {
        setActiveTab((current) => (current === 'habits' ? 'diet' : current));
      }
    };

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      <TimeframeSelector onRangeChange={handleRangeChange} />

      <div className="border-b border-gray-200">
        <div className="flex w-full items-center gap-6">
          <button
            type="button"
            className={`border-b-2 px-1 pb-3 pt-1 text-sm ${
              activeTab === 'diet'
                ? 'border-accent-500 text-accent-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('diet')}
          >
            Diet & Nutrition
          </button>
          <button
            type="button"
            className={`border-b-2 px-1 pb-3 pt-1 text-sm ${
              activeTab === 'habits'
                ? 'border-accent-500 text-accent-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('habits')}
          >
            Habits
          </button>
        </div>
      </div>

      <div ref={tabContentRef}>
        {activeTab === 'diet' ? (
          <NutritionTab
            data={data}
            isLoading={isLoading}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        ) : (
          <HabitTab
            data={data}
            isLoading={isLoading}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}
      </div>
    </section>
  );
};

export default AnalyticsPage;
