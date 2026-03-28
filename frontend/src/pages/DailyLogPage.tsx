import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import DailyLogForm, { type DailyLogFormSubmitPayload } from '../components/forms/DailyLogForm';
import Input from '../components/ui/Input';
import { useHabits } from '../hooks/useHabits';
import { habitLogsApi, logsApi } from '../lib/api';

const toIsoDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const isIsoDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const DailyLogPage = (): JSX.Element => {
  const { date: routeDate } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = useMemo(() => toIsoDate(new Date()), []);
  const selectedDate = useMemo(() => {
    if (!routeDate) {
      return today;
    }
    return isIsoDate(routeDate) ? routeDate : today;
  }, [routeDate, today]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const logQuery = useQuery({
    queryKey: ['logs', selectedDate],
    queryFn: async () => {
      try {
        const response = await logsApi.getByDate(selectedDate);
        return response.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    }
  });

  const habitLogsQuery = useQuery({
    queryKey: ['habit-logs', selectedDate],
    queryFn: async () => {
      const response = await habitLogsApi.list({
        startDate: selectedDate,
        endDate: selectedDate
      });
      return response.data;
    }
  });

  const { data: habits = [], isLoading: habitsLoading } = useHabits();

  const saveMutation = useMutation({
    mutationFn: async (payload: DailyLogFormSubmitPayload) => {
      const existingLog = logQuery.data;

      if (existingLog) {
        await logsApi.update(selectedDate, payload.logData);
      } else {
        await logsApi.create(payload.logData);
      }

      await Promise.all(
        payload.habitLogs.map((habitPayload) =>
          habitLogsApi.upsert({
            habitId: habitPayload.habitId,
            logDate: selectedDate,
            value: habitPayload.value,
            notes: habitPayload.notes
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

  const title = logQuery.data ? "Edit Today's Log" : `Log for ${selectedDate}`;
  const isLoading = logQuery.isLoading || habitLogsQuery.isLoading || habitsLoading;

  return (
    <section className="space-y-5">
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-40 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success">
          {toastMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <div className="w-full md:w-64">
          <Input
            label="Log Date"
            type="date"
            value={selectedDate}
            onChange={(event) => {
              const nextDate = event.target.value;
              if (!nextDate || !isIsoDate(nextDate)) {
                return;
              }
              navigate(`/daily-log/${nextDate}`);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading daily log...</p>
      ) : (
        <DailyLogForm
          date={selectedDate}
          existingLog={logQuery.data ?? null}
          habits={habits}
          habitLogs={habitLogsQuery.data ?? []}
          isSaving={saveMutation.isPending}
          saveError={saveError}
          onSubmit={async (payload) => {
            setSaveError(null);
            await saveMutation.mutateAsync(payload);
          }}
        />
      )}
    </section>
  );
};

export default DailyLogPage;
