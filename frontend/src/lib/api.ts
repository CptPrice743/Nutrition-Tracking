import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosRequestConfig
} from 'axios';

import { useUiStore } from '../store/uiStore';
import type {
  DailyLog,
  CreateDailyLogInput,
  UpdateDailyLogInput,
  Habit,
  CreateHabitInput,
  UpdateHabitInput,
  HabitLog,
  UpsertHabitLogInput,
  WeeklyAnalytics,
  DashboardLayoutResponse,
  DashboardWidgetLayout,
  CsvImportPreview,
  CsvImportResult,
  AuthUser
} from '../types';

type RequestMetadata = {
  startedAt: number;
  timerId?: ReturnType<typeof window.setTimeout>;
  wakeupShown: boolean;
};

type RequestConfigWithMetadata = InternalAxiosRequestConfig & {
  metadata?: RequestMetadata;
};

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true
});

const cleanupWakeup = (config: RequestConfigWithMetadata): void => {
  const metadata = config.metadata;
  if (!metadata) {
    return;
  }

  if (metadata.timerId) {
    window.clearTimeout(metadata.timerId);
  }

  if (metadata.wakeupShown) {
    useUiStore.getState().endWakeup();
    metadata.wakeupShown = false;
  }
};

api.interceptors.request.use((config) => {
  const typedConfig = config as RequestConfigWithMetadata;

  typedConfig.metadata = {
    startedAt: Date.now(),
    wakeupShown: false
  };

  typedConfig.metadata.timerId = window.setTimeout(() => {
    useUiStore.getState().beginWakeup();
    if (typedConfig.metadata) {
      typedConfig.metadata.wakeupShown = true;
    }
  }, 5000);

  return typedConfig;
});

api.interceptors.response.use(
  (response) => {
    cleanupWakeup(response.config as RequestConfigWithMetadata);
    return response;
  },
  (error: AxiosError) => {
    const config = error.config as RequestConfigWithMetadata | undefined;
    if (config) {
      cleanupWakeup(config);
    }

    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  createSession: (idToken: string) => api.post<{ user: AuthUser }>('/auth/session', { idToken }),
  deleteSession: () => api.delete<{ message: string }>('/auth/session')
};

export const logsApi = {
  getByDate: (date: string) => api.get<DailyLog>(`/logs/${date}`),
  list: (params?: { startDate?: string; endDate?: string }) =>
    api.get<DailyLog[]>('/logs', { params }),
  create: (data: CreateDailyLogInput) => api.post<DailyLog>('/logs', data),
  update: (date: string, data: UpdateDailyLogInput) => api.put<DailyLog>(`/logs/${date}`, data)
};

export const habitsApi = {
  list: () => api.get<Habit[]>('/habits'),
  create: (data: CreateHabitInput) => api.post<Habit>('/habits', data),
  update: (id: string, data: UpdateHabitInput) => api.put<Habit>(`/habits/${id}`, data),
  archive: (id: string) => api.patch<Habit>(`/habits/${id}/archive`),
  reorder: (orderedIds: string[]) => api.post<Habit[]>('/habits/reorder', { orderedIds })
};

export const habitLogsApi = {
  list: (params?: { startDate?: string; endDate?: string }) =>
    api.get<HabitLog[]>('/habit-logs', { params }),
  upsert: (data: UpsertHabitLogInput) => api.post<HabitLog>('/habit-logs', data)
};

export const analyticsApi = {
  weekly: (week: string) => api.get<WeeklyAnalytics>('/analytics/weekly', { params: { week } })
};

export const dashboardApi = {
  getLayout: () => api.get<DashboardLayoutResponse>('/dashboard/layout'),
  saveLayout: (layoutJson: DashboardWidgetLayout[]) =>
    api.put<DashboardLayoutResponse>('/dashboard/layout', { layoutJson })
};

export const exportApi = {
  downloadZip: () =>
    api.get<Blob>('/import-export/export', {
      responseType: 'blob'
    })
};

export const importApi = {
  previewCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<CsvImportPreview>('/import-export/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  confirmCsv: (data: {
    columnMapping: Record<string, string>;
    csvBase64?: string;
    csvData?: string;
    conflictResolution?: 'overwrite' | 'skip';
  }) => api.post<CsvImportResult>('/import-export/import/csv/confirm', data)
};

export const typedGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response: AxiosResponse<T> = await api.get(url, config);
  return response.data;
};

export { api };
