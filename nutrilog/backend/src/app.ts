import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorHandler } from './middleware/errorHandler';
import analyticsRoutes from './routes/analytics';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import habitLogsRoutes from './routes/habitLogs';
import habitsRoutes from './routes/habits';
import importExportRoutes from './routes/importExport';
import logsRoutes from './routes/logs';

const app = express();

app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/habit-logs', habitLogsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import-export', importExportRoutes);

app.use(errorHandler);

export { app };
