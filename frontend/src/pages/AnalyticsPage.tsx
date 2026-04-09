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
    if (!node) return;
    const onTouchStart = (e: TouchEvent) => { touchStartXRef.current = e.changedTouches[0]?.clientX ?? null; };
    const onTouchEnd = (e: TouchEvent) => {
      const startX = touchStartXRef.current;
      touchStartXRef.current = null;
      if (startX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX;
      const deltaX = startX - endX;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
      if (deltaX > 0) setActiveTab((c) => c === 'diet' ? 'habits' : c);
      else setActiveTab((c) => c === 'habits' ? 'diet' : c);
    };
    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { node.removeEventListener('touchstart', onTouchStart); node.removeEventListener('touchend', onTouchEnd); };
  }, []);

  return (
    <div className="page-container">
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <span className="page-eyebrow">Performance Lab</span>
        <div
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
        >
          <h1 className="headline">Analytics</h1>
          <TimeframeSelector onRangeChange={handleRangeChange} />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 24,
          borderBottom: '2px solid var(--surface-container-low)'
        }}
      >
        {(['diet', 'habits'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              marginBottom: -2,
              transition: 'color var(--transition)',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'diet' ? 'Diet & Nutrition' : 'Habits'}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
    </div>
  );
};

export default AnalyticsPage;
