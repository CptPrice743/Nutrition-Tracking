export type DayType = 'normal' | 'restaurant';

export type DailyLog = {
  id: string;
  userId: string;
  date: string;
  weightKg: number | null;
  caloriesConsumed: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatTotalG: number | null;
  fatSaturatedG: number | null;
  fatUnsaturatedG: number | null;
  fatTransG: number | null;
  fiberG: number | null;
  sugarsG: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  magnesiumMg: number | null;
  ironMg: number | null;
  zincMg: number | null;
  waterLitres: number | null;
  dayType: DayType | null;
  notes: string | null;
};

export type CreateDailyLogInput = {
  date: string;
  weightKg?: number;
  caloriesConsumed?: number;
  proteinG?: number;
  carbsG?: number;
  fatTotalG?: number;
  fatSaturatedG?: number;
  fatUnsaturatedG?: number;
  fatTransG?: number;
  fiberG?: number;
  sugarsG?: number;
  sodiumMg?: number;
  calciumMg?: number;
  magnesiumMg?: number;
  ironMg?: number;
  zincMg?: number;
  waterLitres?: number;
  dayType?: DayType;
  notes?: string;
};

export type UpdateDailyLogInput = Partial<CreateDailyLogInput>;

export type Habit = {
  id: string;
  userId: string;
  name: string;
  habitType: 'count' | 'boolean';
  unitLabel: string | null;
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'x_per_week' | 'x_per_month' | 'x_in_y_days';
  frequencyX: number | null;
  frequencyY: number | null;
  scheduledDays: number[] | null;
  scheduledDates: number[] | null;
  targetValue: number | null;
  targetDirection: 'at_least' | 'at_most' | null;
  isCalorieBurning: boolean;
  calorieUnit: number | null;
  calorieKcal: number | null;
  isActive: boolean;
  displayOrder: number;
};

export type CreateHabitInput = {
  name: string;
  habitType: 'count' | 'boolean';
  unitLabel?: string;
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'x_per_week' | 'x_per_month' | 'x_in_y_days';
  frequencyX?: number;
  frequencyY?: number;
  scheduledDays?: number[];
  scheduledDates?: number[];
  targetValue?: number;
  targetDirection?: 'at_least' | 'at_most';
  isCalorieBurning?: boolean;
  calorieUnit?: number;
  calorieKcal?: number;
};

export type UpdateHabitInput = Partial<CreateHabitInput>;

export type HabitLog = {
  id: string;
  userId: string;
  habitId: string;
  logDate: string;
  value: number | null;
  caloriesBurned: number | null;
  notes: string | null;
};

export type UpsertHabitLogInput = {
  habitId: string;
  logDate: string;
  value: number;
  notes?: string;
};

export type HabitDailyValue = {
  date: string;
  value: number | null;
  caloriesBurned?: number | null;
};

export type DailyLogSummary = {
  date: string;
  weightKg: number | null;
  caloriesConsumed: number | null;
  caloriesBurned: number | null;
  netCalories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatTotalG: number | null;
  fatSaturatedG: number | null;
  fatUnsaturatedG: number | null;
  fiberG: number | null;
  sugarsG: number | null;
  sodiumMg: number | null;
  calciumMg: number | null;
  waterLitres: number | null;
  dayType: string | null;
};

export type HabitPeriodSummary = {
  habitId: string;
  habitName: string;
  habitType: 'count' | 'boolean';
  unitLabel?: string | null;
  frequencyType: string;
  scheduledDays: number[] | null;
  scheduledDates: number[] | null;
  targetValue: number | null;
  targetDirection: 'at_least' | 'at_most' | null;
  isCalorieBurning: boolean;
  dailyValues: { date: string; value: number | null; caloriesBurned: number | null }[];
  totalCaloriesBurned: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
};

export type AnalyticsResult = {
  startDate: string;
  endDate: string;
  daysLogged: number;
  avgWeightKg: number | null;
  weightDeltaVsPrevPeriod: number | null;
  avgCaloriesConsumed: number | null;
  avgCaloriesBurned: number | null;
  avgNetCalories: number | null;
  totalPeriodDeficitSurplus: number | null;
  avgProteinG: number | null;
  avgCarbsG: number | null;
  avgFatTotalG: number | null;
  avgFatSaturatedG: number | null;
  avgFatUnsaturatedG: number | null;
  avgFatTransG: number | null;
  avgFiberG: number | null;
  avgSugarsG: number | null;
  avgSodiumMg: number | null;
  avgCalciumMg: number | null;
  avgMagnesiumMg: number | null;
  avgIronMg: number | null;
  avgZincMg: number | null;
  avgWaterLitres: number | null;
  normalDays: number;
  restaurantDays: number;
  estimatedTDEE: number | null;
  tdeeConfidenceBand: number | null;
  rollingAvgTDEE: number | null;
  baselineTDEE: number | null;
  dailyLogSummaries: DailyLogSummary[];
  habitSummaries: HabitPeriodSummary[];
};

export type HabitWeeklySummary = HabitPeriodSummary;
export type WeeklyAnalytics = AnalyticsResult & { dailyLogs: DailyLogSummary[] };

export type DashboardWidgetLayout = {
  widgetId: string;
  position: number;
  size: 'small' | 'medium' | 'large';
};

export type DashboardLayoutResponse = {
  layoutJson: DashboardWidgetLayout[];
};

export type UserGender = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light_active' | 'highly_active';

export type User = {
  id: string;
  email: string;
  displayName: string | null;
  age: number | null;
  gender: UserGender | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  calorieTarget: number | null;
};

export type AuthUser = User;

export type UpdateProfileInput = {
  displayName?: string;
  age?: number;
  gender?: UserGender;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  calorieTarget?: number;
};

export type CsvImportPreview = {
  detectedColumns: string[];
  previewRows: Record<string, string>[];
  suggestedMappings: Record<string, string | null>;
  formatValid: boolean;
};

export type CsvImportConflict = {
  row: number;
  date: string;
  action: 'overwrite' | 'skip';
};

export type CsvImportResult = {
  imported: number;
  skipped: number;
  conflicts: CsvImportConflict[];
};
