import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import DailyLogForm, { type DailyLogFormSubmitPayload } from '../components/forms/DailyLogForm';
import { useAuth } from '../hooks/useAuth';
import { useHabits } from '../hooks/useHabits';
import { habitLogsApi, logsApi } from '../lib/api';

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatDisplayDate = (isoDate: string): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(d).toUpperCase();
};

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
};

const DailyLogPage = (): JSX.Element => {
  const { date: routeDate } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const today = useMemo(() => toIsoDate(new Date()), []);
  const selectedDate = useMemo(() => {
    if (!routeDate) return today;
    return isIsoDate(routeDate) ? routeDate : today;
  }, [routeDate, today]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const logQuery = useQuery({
    queryKey: ['logs', selectedDate],
    queryFn: async () => {
      try {
        return (await logsApi.getByDate(selectedDate)).data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    }
  });

  const habitLogsQuery = useQuery({
    queryKey: ['habit-logs', selectedDate],
    queryFn: async () => {
      const response = await habitLogsApi.list({ startDate: selectedDate, endDate: selectedDate });
      return response.data;
    }
  });

  const { data: habits = [], isLoading: habitsLoading } = useHabits();

  const saveMutation = useMutation({
    mutationFn: async (payload: DailyLogFormSubmitPayload) => {
      if (logQuery.data) {
        await logsApi.update(selectedDate, payload.logData);
      } else {
        await logsApi.create(payload.logData);
      }
      await Promise.all(
        payload.habitLogs.map((hp) =>
          habitLogsApi.upsert({
            habitId: hp.habitId,
            logDate: selectedDate,
            value: hp.value,
            notes: hp.notes
          })
        )
      );
    },
    onSuccess: async () => {
      setSaveError(null);
      setToastMessage('Saved successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['logs', selectedDate] }),
        queryClient.invalidateQueries({ queryKey: ['log', selectedDate] }),
        queryClient.invalidateQueries({ queryKey: ['habit-logs'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-logs', selectedDate] })
      ]);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        setSaveError('A log already exists for this date. Pick another date or edit the existing entry.');
        return;
      }
      setSaveError('Unable to save your log right now. Please try again.');
    }
  });

  const isLoading = logQuery.isLoading || habitLogsQuery.isLoading || habitsLoading;
  const consumed = logQuery.data?.caloriesConsumed ? Number(logQuery.data.caloriesConsumed) : null;
  const burned = (habitLogsQuery.data ?? []).reduce((s, l) => s + Number(l.caloriesBurned ?? 0), 0);
  const netBalance = consumed !== null ? consumed - burned : null;
  const calorieTarget = user?.calorieTarget ?? 2300;

  return (
    <div className="page-container">
      {/* Toast */}
      {toastMessage ? (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 60,
            background: 'var(--success-bg)',
            color: 'var(--success-text)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--shadow-float)'
          }}
        >
          {toastMessage}
        </div>
      ) : null}

      {/* Page header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 24
        }}
        className="md:!flex-row md:!items-start md:!justify-between"
      >
        <div>
          <span className="page-eyebrow">{formatDisplayDate(selectedDate)}</span>
          <h1 className="headline">Daily Log</h1>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '10px 14px', minWidth: 40 }}
            onClick={() => navigate(`/daily-log/${addDays(selectedDate, -1)}`)}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '10px 16px' }}
            onClick={() => navigate(`/daily-log/${today}`)}
          >
            Today
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '10px 14px', minWidth: 40 }}
            disabled={selectedDate >= today}
            onClick={() => navigate(`/daily-log/${addDays(selectedDate, 1)}`)}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      {/* Dark summary bar */}
      <div
        className="card-hero"
        style={{ padding: '16px 24px', marginBottom: 24 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0
          }}
        >
          {[
            { label: 'Consumed', value: consumed?.toLocaleString() ?? '–', unit: 'kcal', color: 'var(--primary)' },
            { label: 'Burned', value: burned > 0 ? burned.toLocaleString() : '–', unit: 'kcal', color: '#ffffff' },
            { label: 'Net Balance', value: netBalance?.toLocaleString() ?? '–', unit: '', color: '#ffffff' },
            { label: `Target: ${Number(calorieTarget).toLocaleString()}`, value: '', unit: '', color: '#ffffff', isProgress: true }
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                padding: '0 16px',
                textAlign: 'center'
              }}
            >
              <div className="overline" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                {stat.label}
              </div>
              {stat.isProgress ? (
                <>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                    {netBalance?.toLocaleString() ?? '–'}
                  </div>
                  {netBalance !== null && (
                    <div style={{ marginTop: 6 }}>
                      <div className="progress-track" style={{ height: 4 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(100, ((netBalance / Number(calorieTarget)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                  {stat.value}
                  {stat.unit && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>{stat.unit}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: 14 }}>
          Loading daily log...
        </div>
      ) : (
        <DailyLogForm
          date={selectedDate}
          existingLog={logQuery.data ?? null}
          habits={habits}
          habitLogs={habitLogsQuery.data ?? []}
          calorieTarget={user?.calorieTarget ?? null}
          isSaving={saveMutation.isPending}
          saveError={saveError}
          onSubmit={async (payload) => {
            setSaveError(null);
            await saveMutation.mutateAsync(payload);
          }}
        />
      )}
    </div>
  );
};

export default DailyLogPage;
