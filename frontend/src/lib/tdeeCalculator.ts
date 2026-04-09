export function calculateBMR(params: {
  gender: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { gender, weightKg, heightCm, age } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return Math.round(base + 5);
  if (gender === 'female') return Math.round(base - 161);
  return Math.round(base - 78); // 'other': midpoint of male/female offsets
}

// Lifestyle-only multipliers — excludes dedicated exercise (tracked via habit logs)
export const LIFESTYLE_OPTIONS = [
  {
    value: 'sedentary',
    label: 'Desk Bound',
    description: 'Student, office worker, mostly sitting',
    multiplier: 1.2
  },
  {
    value: 'light_active',
    label: 'Lightly Active',
    description: 'Teacher, retail, standing desk, walking around campus',
    multiplier: 1.35
  },
  {
    value: 'highly_active',
    label: 'Highly Active',
    description: 'Construction, physical labour, constantly on feet',
    multiplier: 1.5
  }
] as const;

export type LifestyleValue = typeof LIFESTYLE_OPTIONS[number]['value'];

export function calculateMaintenance(bmr: number, lifestyle: LifestyleValue): number {
  const option = LIFESTYLE_OPTIONS.find((o) => o.value === lifestyle);
  return Math.round(bmr * (option?.multiplier ?? 1.2));
}

export const DEFICIT_PRESETS = [
  { label: 'Relaxed', weeklyLossKg: 0.25, deficitKcal: 250 },
  { label: 'Easy', weeklyLossKg: 0.5, deficitKcal: 500 },
  { label: 'Hard', weeklyLossKg: 0.75, deficitKcal: 750 },
  { label: 'Intense', weeklyLossKg: 1.0, deficitKcal: 1000 }
] as const;

export const AGGRESSIVE_CUT_THRESHOLD = 0.25; // 25% of maintenance

export function isAggressiveCut(targetCalories: number, maintenance: number): boolean {
  return maintenance - targetCalories > maintenance * AGGRESSIVE_CUT_THRESHOLD;
}

export function isSurplusTarget(targetCalories: number, maintenance: number): boolean {
  return targetCalories > maintenance;
}
