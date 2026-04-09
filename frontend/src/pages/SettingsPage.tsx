import { useEffect, useMemo, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { useUpdateProfile } from '../hooks/useProfile';
import { importApi, logsApi } from '../lib/api';
import {
  DEFICIT_PRESETS,
  LIFESTYLE_OPTIONS,
  calculateBMR,
  calculateMaintenance,
  isAggressiveCut,
  type LifestyleValue
} from '../lib/tdeeCalculator';
import type {
  ActivityLevel,
  CsvImportConflict,
  CsvImportPreview,
  CsvImportResult,
  UpdateProfileInput,
  UserGender
} from '../types';

type ImportStep = 'upload' | 'formatWarning' | 'mapping' | 'conflicts' | 'result';
type HabitImportStep = 'upload' | 'conflicts' | 'result';

type AppFieldOption = {
  value: string;
  label: string;
};

type HabitImportConflict = {
  habitName: string;
  existingHabitId: string;
  existingHabit: {
    name: string;
    habitType: string;
    frequencyType: string;
    targetValue: number | null;
    isCalorieBurning: boolean;
  };
  incomingHabit: {
    name: string;
    habitType: string;
    frequencyType: string;
    targetValue?: number;
    isCalorieBurning: boolean;
  };
};

type HabitDefinitionsPreviewResponse = {
  totalRows: number;
  validRows: number;
  errors: { row: number; message: string }[];
  conflicts: HabitImportConflict[];
  newHabits: string[];
};

type HabitLogsPreviewResponse = {
  totalRows: number;
  validRows: number;
  errors: { row: number; message: string }[];
  unresolvedHabits: string[];
  resolvedHabits: string[];
};

type HabitImportResult = {
  habitsCreated: number;
  habitsUpdated: number;
  habitsLinked: number;
  logsImported: number;
  logsSkipped: number;
};

type ConflictResolution = 'link' | 'create_new' | 'overwrite';

type ProfileFormErrors = {
  age?: string;
  heightCm?: string;
};

type HeightUnit = 'cm' | 'ftin';
type WeightUnit = 'kg' | 'lbs';

const APP_FIELD_OPTIONS: AppFieldOption[] = [
  { value: '__ignore__', label: 'Ignore this column' },
  { value: 'date', label: 'Date' },
  { value: 'weight_kg', label: 'Weight (kg)' },
  { value: 'calories_consumed', label: 'Calories Consumed' },
  { value: 'protein_g', label: 'Protein (g)' },
  { value: 'carbs_g', label: 'Carbs (g)' },
  { value: 'fat_total_g', label: 'Total Fat (g)' },
  { value: 'fat_saturated_g', label: 'Saturated Fat (g)' },
  { value: 'fat_unsaturated_g', label: 'Unsaturated Fat (g)' },
  { value: 'fat_trans_g', label: 'Trans Fat (g)' },
  { value: 'fiber_g', label: 'Fiber (g)' },
  { value: 'sugars_g', label: 'Sugars (g)' },
  { value: 'sodium_mg', label: 'Sodium (mg)' },
  { value: 'calcium_mg', label: 'Calcium (mg)' },
  { value: 'magnesium_mg', label: 'Magnesium (mg)' },
  { value: 'iron_mg', label: 'Iron (mg)' },
  { value: 'zinc_mg', label: 'Zinc (mg)' },
  { value: 'water_litres', label: 'Water (L)' },
  { value: 'day_type', label: 'Day Type' },
  { value: 'notes', label: 'Notes' }
];

const GENDER_OPTIONS: Array<{ value: UserGender | ''; label: string; disabled?: boolean }> = [
  { value: '', label: 'Select gender', disabled: true },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

const APP_FIELD_LOOKUP = new Set(APP_FIELD_OPTIONS.map((option) => option.value));

const REQUIRED_FORMAT_COLUMNS = [
  'date',
  'weight_kg',
  'calories_consumed',
  'protein_g',
  'carbs_g',
  'water_litres',
  'day_type'
];

const normalizeMappingValue = (value: string | null | undefined): string => {
  if (!value) {
    return '__ignore__';
  }

  return APP_FIELD_LOOKUP.has(value) ? value : '__ignore__';
};

const readFileAsText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unable to read file as text.'));
    };

    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsText(file);
  });
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve((reader.result as string).split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const conflictRowsFromResult = (result: CsvImportResult): CsvImportConflict[] => {
  return result.conflicts ?? [];
};

const toIsoDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const roundToSingleDecimal = (value: number): number => {
  return Math.round(value * 10) / 10;
};

const formatSingleDecimal = (value: number): string => {
  return String(roundToSingleDecimal(value));
};

const kgToLbs = (kg: number): number => {
  return roundToSingleDecimal(kg * 2.2046);
};

const lbsToKg = (lbs: number): number => {
  return roundToSingleDecimal(lbs / 2.2046);
};

const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = roundToSingleDecimal(totalInches - feet * 12);

  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }

  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number): number => {
  return roundToSingleDecimal(feet * 30.48 + inches * 2.54);
};

const SettingsPage = (): JSX.Element => {
  const { signOut, user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const queryClient = useQueryClient();
  const hydratedUserIdRef = useRef<string | null>(null);

  const [profile, setProfile] = useState({
    displayName: '',
    age: '',
    gender: '' as UserGender | '',
    heightCm: '',
    heightFt: '',
    heightIn: '',
    weightKg: '',
    weightLbs: '',
    activityLevel: '' as ActivityLevel | '',
    calorieTarget: ''
  });
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileToast, setProfileToast] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>('upload');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<CsvImportPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [csvData, setCsvData] = useState<string>('');
  const [conflicts, setConflicts] = useState<CsvImportConflict[]>([]);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [habitImportStep, setHabitImportStep] = useState<HabitImportStep>('upload');
  const [habitDefinitionsFile, setHabitDefinitionsFile] = useState<File | null>(null);
  const [habitLogsFile, setHabitLogsFile] = useState<File | null>(null);
  const [isDraggingDefinitionsFile, setIsDraggingDefinitionsFile] = useState(false);
  const [isDraggingHabitLogsFile, setIsDraggingHabitLogsFile] = useState(false);
  const [isHabitImportLoading, setIsHabitImportLoading] = useState(false);
  const [habitImportMessage, setHabitImportMessage] = useState<string | null>(null);
  const [habitDefinitionsPreview, setHabitDefinitionsPreview] = useState<HabitDefinitionsPreviewResponse | null>(null);
  const [habitLogsPreview, setHabitLogsPreview] = useState<HabitLogsPreviewResponse | null>(null);
  const [habitConflictResolutions, setHabitConflictResolutions] = useState<Record<string, ConflictResolution>>({});
  const [habitImportResult, setHabitImportResult] = useState<HabitImportResult | null>(null);
  const habitDefinitionsInputRef = useRef<HTMLInputElement | null>(null);
  const habitLogsInputRef = useRef<HTMLInputElement | null>(null);

  const hasImportFile = importFile !== null;
  const today = useMemo(() => new Date(), []);
  const recentWeightStartDate = useMemo(() => {
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    return toIsoDate(from);
  }, [today]);
  const recentWeightEndDate = useMemo(() => toIsoDate(today), [today]);

  const recentLogsQuery = useQuery({
    queryKey: ['logs', 'weight-reference', recentWeightStartDate, recentWeightEndDate],
    queryFn: async () => {
      const response = await logsApi.list({
        startDate: recentWeightStartDate,
        endDate: recentWeightEndDate
      });
      return response.data;
    }
  });

  const recentWeightFromLogs = useMemo(() => {
    const logs = recentLogsQuery.data ?? [];
    const logWithWeight = logs.find((log) => log.weightKg != null);
    if (!logWithWeight || logWithWeight.weightKg == null) {
      return null;
    }

    const numericWeight = Number(logWithWeight.weightKg);
    return Number.isFinite(numericWeight) ? numericWeight : null;
  }, [recentLogsQuery.data]);

  function setField<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (!user) {
      hydratedUserIdRef.current = null;
      setSelectedPreset(null);
      return;
    }

    if (hydratedUserIdRef.current !== user.id) {
      setProfile({
        displayName: user.displayName ?? '',
        age: user.age != null ? String(user.age) : '',
        gender: user.gender ?? '',
        heightCm: user.heightCm != null ? String(user.heightCm) : '',
        heightFt: user.heightCm != null ? String(Math.floor(Number(user.heightCm) / 30.48)) : '',
        heightIn:
          user.heightCm != null
            ? String(Math.round((((Number(user.heightCm) % 30.48) / 2.54) * 2)) / 2)
            : '',
        weightKg: '',
        weightLbs: '',
        activityLevel: user.activityLevel ?? '',
        calorieTarget: user.calorieTarget != null ? String(user.calorieTarget) : ''
      });
      setHeightUnit('cm');
      setWeightUnit('kg');
      setProfileErrors({});
      setProfileMessage(null);
      hydratedUserIdRef.current = user.id;
    }

    if (
      user.calorieTarget != null &&
      user.age != null &&
      user.gender != null &&
      user.heightCm != null &&
      user.activityLevel != null &&
      recentWeightFromLogs != null
    ) {
      const maintenanceForUser = calculateMaintenance(
        calculateBMR({
          gender: user.gender,
          weightKg: recentWeightFromLogs,
          heightCm: user.heightCm,
          age: user.age
        }),
        user.activityLevel as LifestyleValue
      );
      const matchedPreset = DEFICIT_PRESETS.find(
        (preset) => maintenanceForUser - preset.deficitKcal === user.calorieTarget
      );
      setSelectedPreset(matchedPreset?.deficitKcal ?? null);
    } else {
      setSelectedPreset(null);
    }
  }, [recentWeightFromLogs, user]);

  useEffect(() => {
    if (!profileToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setProfileToast(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [profileToast]);

  useEffect(() => {
    if (recentWeightFromLogs === null) {
      return;
    }

    if (profile.weightKg.trim().length > 0 || profile.weightLbs.trim().length > 0) {
      return;
    }

    setProfile((prev) => ({
      ...prev,
      weightKg: formatSingleDecimal(recentWeightFromLogs),
      weightLbs: formatSingleDecimal(kgToLbs(recentWeightFromLogs))
    }));
  }, [profile.weightKg, profile.weightLbs, recentWeightFromLogs]);

  const weightKgForCalc =
    weightUnit === 'kg'
      ? profile.weightKg !== ''
        ? Number(profile.weightKg)
        : null
      : profile.weightLbs !== ''
        ? Math.round((Number(profile.weightLbs) / 2.2046) * 10) / 10
        : null;

  const heightCmForCalc =
    heightUnit === 'cm'
      ? profile.heightCm !== ''
        ? Number(profile.heightCm)
        : null
      : profile.heightFt !== '' || profile.heightIn !== ''
        ? Math.round((Number(profile.heightFt || 0) * 30.48 + Number(profile.heightIn || 0) * 2.54) * 10) / 10
        : null;

  const canShowWizard =
    profile.age !== '' &&
    profile.gender !== '' &&
    heightCmForCalc !== null &&
    weightKgForCalc !== null &&
    profile.activityLevel !== '';

  const maintenance = canShowWizard
    ? calculateMaintenance(
        calculateBMR({
          gender: profile.gender as 'male' | 'female' | 'other',
          weightKg: weightKgForCalc,
          heightCm: heightCmForCalc,
          age: Number(profile.age)
        }),
        profile.activityLevel as LifestyleValue
      )
    : null;

  const targetNum = profile.calorieTarget !== '' ? Number(profile.calorieTarget) : null;
  const showSurplusWarning = maintenance !== null && targetNum !== null && targetNum > maintenance;
  const showAggressiveWarning =
    maintenance !== null &&
    targetNum !== null &&
    !showSurplusWarning &&
    isAggressiveCut(targetNum, maintenance);

  const detectedColumns = useMemo(
    () => importPreview?.detectedColumns ?? [],
    [importPreview]
  );

  const previewRows = useMemo(() => importPreview?.previewRows ?? [], [importPreview]);

  const uniqueConflictRows = useMemo(() => {
    const seen = new Set<string>();
    const deduped: CsvImportConflict[] = [];

    for (const conflict of conflicts) {
      const key = `${conflict.row}:${conflict.date}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(conflict);
    }

    return deduped;
  }, [conflicts]);

  const requiredColumnStatus = useMemo(() => {
    const normalizedDetected = new Set(
      (importPreview?.detectedColumns ?? []).map((column) => column.trim().toLowerCase())
    );

    return REQUIRED_FORMAT_COLUMNS.map((requiredColumn) => ({
      name: requiredColumn,
      detected: normalizedDetected.has(requiredColumn)
    }));
  }, [importPreview?.detectedColumns]);

  function buildSavePayload(): UpdateProfileInput {
    const heightCmFinal =
      heightUnit === 'cm'
        ? profile.heightCm !== ''
          ? Number(profile.heightCm)
          : undefined
        : profile.heightFt !== '' || profile.heightIn !== ''
          ? Math.round((Number(profile.heightFt || 0) * 30.48 + Number(profile.heightIn || 0) * 2.54) * 10) / 10
          : undefined;

    return {
      displayName: profile.displayName || undefined,
      age: profile.age !== '' ? Number(profile.age) : undefined,
      gender: profile.gender || undefined,
      heightCm: heightCmFinal,
      activityLevel: profile.activityLevel || undefined,
      calorieTarget: profile.calorieTarget !== '' ? Number(profile.calorieTarget) : undefined
    };
  }

  const handleSaveProfile = async () => {
    setProfileMessage(null);

    const nextErrors: ProfileFormErrors = {};
    if (profile.age !== '') {
      const parsedAge = Number(profile.age);
      if (!Number.isInteger(parsedAge) || parsedAge < 11 || parsedAge > 120) {
        nextErrors.age = 'Age must be an integer between 11 and 120.';
      }
    }

    const payload = buildSavePayload();
    if (payload.heightCm !== undefined && (!Number.isFinite(payload.heightCm) || payload.heightCm < 100 || payload.heightCm > 250)) {
      nextErrors.heightCm = 'Height must be between 100 and 250 cm.';
    }

    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync(payload);
      setProfileMessage(null);
      setProfileToast('Profile saved');
    } catch {
      setProfileMessage('Unable to save profile right now.');
    }
  };

  const handlePresetSelect = (deficitKcal: number) => {
    if (maintenance === null) {
      return;
    }

    const target = maintenance - deficitKcal;
    setField('calorieTarget', String(target));
    setSelectedPreset(deficitKcal);
  };

  const unitToggleButtonClass = (selected: boolean): string => {
    return selected
      ? 'bg-accent-500 text-white rounded-full px-3 py-1 text-sm'
      : 'bg-gray-100 text-gray-500 rounded-full px-3 py-1 text-sm hover:bg-gray-200';
  };

  const handleHeightUnitChange = (nextUnit: HeightUnit) => {
    if (nextUnit === heightUnit) {
      return;
    }

    if (nextUnit === 'ftin') {
      const parsedHeightCm = Number(profile.heightCm);
      if (Number.isFinite(parsedHeightCm) && parsedHeightCm > 0) {
        const converted = cmToFeetInches(parsedHeightCm);
        setField('heightFt', String(converted.feet));
        setField('heightIn', formatSingleDecimal(converted.inches));
      }
    } else {
      const feet = Number(profile.heightFt);
      const inches = Number(profile.heightIn);
      if (Number.isFinite(feet) && Number.isFinite(inches) && feet > 0) {
        setField('heightCm', formatSingleDecimal(feetInchesToCm(feet, inches)));
      }
    }

    setHeightUnit(nextUnit);
    setProfileErrors((current) => ({ ...current, heightCm: undefined }));
    setProfileMessage(null);
  };

  const handleWeightUnitChange = (nextUnit: WeightUnit) => {
    if (nextUnit === weightUnit) {
      return;
    }

    if (nextUnit === 'lbs') {
      const parsedKg = Number(profile.weightKg);
      if (Number.isFinite(parsedKg) && parsedKg > 0) {
        setField('weightLbs', formatSingleDecimal(kgToLbs(parsedKg)));
      }
    } else {
      const parsedLbs = Number(profile.weightLbs);
      if (Number.isFinite(parsedLbs) && parsedLbs > 0) {
        setField('weightKg', formatSingleDecimal(lbsToKg(parsedLbs)));
      }
    }

    setWeightUnit(nextUnit);
  };

  const handleHeightCmChange = (nextValue: string) => {
    setField('heightCm', nextValue);
    const parsedHeightCm = Number(nextValue);
    if (Number.isFinite(parsedHeightCm) && parsedHeightCm > 0) {
      const converted = cmToFeetInches(parsedHeightCm);
      setField('heightFt', String(converted.feet));
      setField('heightIn', formatSingleDecimal(converted.inches));
    }

    setProfileErrors((current) => ({ ...current, heightCm: undefined }));
    setProfileMessage(null);
  };

  const handleHeightFeetChange = (nextValue: string) => {
    setField('heightFt', nextValue);

    const feet = Number(nextValue);
    const inches = Number(profile.heightIn);
    if (Number.isFinite(feet) && Number.isFinite(inches) && feet > 0 && inches >= 0) {
      setField('heightCm', formatSingleDecimal(feetInchesToCm(feet, inches)));
    }

    setProfileErrors((current) => ({ ...current, heightCm: undefined }));
    setProfileMessage(null);
  };

  const handleHeightInchesChange = (nextValue: string) => {
    setField('heightIn', nextValue);

    const feet = Number(profile.heightFt);
    const inches = Number(nextValue);
    if (Number.isFinite(feet) && Number.isFinite(inches) && feet > 0 && inches >= 0) {
      setField('heightCm', formatSingleDecimal(feetInchesToCm(feet, inches)));
    }

    setProfileErrors((current) => ({ ...current, heightCm: undefined }));
    setProfileMessage(null);
  };

  const handleWeightKgChange = (nextValue: string) => {
    setField('weightKg', nextValue);
    const parsedWeightKg = Number(nextValue);
    if (Number.isFinite(parsedWeightKg) && parsedWeightKg > 0) {
      setField('weightLbs', formatSingleDecimal(kgToLbs(parsedWeightKg)));
    }
  };

  const handleWeightLbsChange = (nextValue: string) => {
    setField('weightLbs', nextValue);
    const parsedWeightLbs = Number(nextValue);
    if (Number.isFinite(parsedWeightLbs) && parsedWeightLbs > 0) {
      setField('weightKg', formatSingleDecimal(lbsToKg(parsedWeightLbs)));
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/import-export/export`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nutrilog-export.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage('Export downloaded successfully.');
    } catch {
      setExportMessage('Unable to export data right now.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImportTemplate = async () => {
    setIsTemplateDownloading(true);
    setImportMessage(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/import-export/import/template`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'nutrilog-template.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setImportMessage('Unable to download import template right now.');
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  const resetImportFlow = () => {
    setImportStep('upload');
    setImportFile(null);
    setImportPreview(null);
    setColumnMapping({});
    setCsvData('');
    setConflicts([]);
    setImportResult(null);
    setImportMessage(null);
    setIsImporting(false);
    setIsDraggingFile(false);
  };

  const handleFileSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportMessage('Only .csv files are supported.');
      return;
    }

    setImportMessage(null);
    setIsImporting(true);

    try {
      const [previewResponse, fileText] = await Promise.all([
        importApi.previewCsv(file),
        readFileAsText(file)
      ]);

      const preview = previewResponse.data;
      const initialMapping: Record<string, string> = {};
      for (const column of preview.detectedColumns) {
        initialMapping[column] = normalizeMappingValue(preview.suggestedMappings[column]);
      }

      setImportFile(file);
      setImportPreview(preview);
      setColumnMapping(initialMapping);
      setCsvData(fileText);
      setConflicts([]);
      setImportResult(null);
      setImportStep(preview.formatValid ? 'mapping' : 'formatWarning');
    } catch (error) {
      const responseData = isAxiosError(error) ? error.response?.data : null;
      const errorCode =
        responseData && typeof responseData === 'object' && 'code' in responseData
          ? (responseData as { code?: unknown }).code
          : undefined;

      if (isAxiosError(error) && error.response?.status === 400 && errorCode === 'INVALID_FILE') {
        setImportMessage('This file could not be read. Please upload a valid CSV file.');
        setImportStep('upload');
        return;
      }

      setImportMessage('Unable to parse CSV file. Please check the file format.');
      setImportStep('upload');
    } finally {
      setIsImporting(false);
    }
  };

  const buildConfirmPayload = (conflictResolution: 'skip' | 'overwrite') => {
    const mappedColumns: Record<string, string> = {};

    for (const [column, mappedField] of Object.entries(columnMapping)) {
      if (!mappedField || mappedField === '__ignore__') {
        continue;
      }
      mappedColumns[column] = mappedField;
    }

    return {
      columnMapping: mappedColumns,
      csvData,
      conflictResolution
    };
  };

  const finalizeSuccessfulImport = async (result: CsvImportResult) => {
    setImportResult(result);
    setImportStep('result');
    await queryClient.invalidateQueries({ queryKey: ['logs'] });
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };

  const handleConfirmMapping = async () => {
    if (!hasImportFile || !importPreview) {
      setImportMessage('Select a CSV file first.');
      return;
    }

    setImportMessage(null);
    setIsImporting(true);

    try {
      const response = await importApi.confirmCsv(buildConfirmPayload('skip'));
      const result = response.data;
      const nextConflicts = conflictRowsFromResult(result);

      if (nextConflicts.length > 0) {
        setConflicts(nextConflicts);
        setImportStep('conflicts');
        return;
      }

      await finalizeSuccessfulImport(result);
    } catch {
      setImportMessage('Unable to confirm mapping. Please review the CSV and mappings.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleResolveConflicts = async (resolution: 'skip' | 'overwrite') => {
    setImportMessage(null);
    setIsImporting(true);

    try {
      const response = await importApi.confirmCsv(buildConfirmPayload(resolution));
      await finalizeSuccessfulImport(response.data);
    } catch {
      setImportMessage('Unable to apply conflict resolution. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  };

  const resetHabitImportFlow = () => {
    setHabitImportStep('upload');
    setHabitDefinitionsFile(null);
    setHabitLogsFile(null);
    setIsDraggingDefinitionsFile(false);
    setIsDraggingHabitLogsFile(false);
    setIsHabitImportLoading(false);
    setHabitImportMessage(null);
    setHabitDefinitionsPreview(null);
    setHabitLogsPreview(null);
    setHabitConflictResolutions({});
    setHabitImportResult(null);
  };

  const handleHabitFileSelected = (
    type: 'definitions' | 'logs',
    file: File
  ) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setHabitImportMessage('Only .csv files are supported.');
      return;
    }

    setHabitImportMessage(null);
    if (type === 'definitions') {
      setHabitDefinitionsFile(file);
      return;
    }

    setHabitLogsFile(file);
  };

  const handlePreviewHabitImport = async () => {
    if (!habitDefinitionsFile && !habitLogsFile) {
      setHabitImportMessage('Upload at least one habits CSV file to continue.');
      return;
    }

    setIsHabitImportLoading(true);
    setHabitImportMessage(null);

    try {
      const [definitionsResponse, logsResponse] = await Promise.all([
        habitDefinitionsFile
          ? importApi.previewHabitDefinitions(habitDefinitionsFile)
          : Promise.resolve(null),
        habitLogsFile ? importApi.previewHabitLogs(habitLogsFile) : Promise.resolve(null)
      ]);

      const parsedDefinitions = (definitionsResponse?.data ?? null) as HabitDefinitionsPreviewResponse | null;
      const parsedLogs = (logsResponse?.data ?? null) as HabitLogsPreviewResponse | null;

      setHabitDefinitionsPreview(parsedDefinitions);
      setHabitLogsPreview(parsedLogs);

      if (parsedDefinitions?.conflicts?.length) {
        const defaultResolutions: Record<string, ConflictResolution> = {};
        for (const conflict of parsedDefinitions.conflicts) {
          defaultResolutions[conflict.habitName] = 'link';
        }
        setHabitConflictResolutions(defaultResolutions);
        setHabitImportStep('conflicts');
        return;
      }

      setHabitConflictResolutions({});
      setHabitImportStep('conflicts');
    } catch {
      setHabitImportMessage('Unable to preview habit import files. Please check CSV format and try again.');
      setHabitImportStep('upload');
    } finally {
      setIsHabitImportLoading(false);
    }
  };

  const handleConflictResolutionChange = (habitName: string, resolution: ConflictResolution) => {
    setHabitConflictResolutions((prev) => ({
      ...prev,
      [habitName]: resolution
    }));
  };

  const handleConfirmHabitImport = async () => {
    if (!habitDefinitionsFile && !habitLogsFile) {
      setHabitImportMessage('Upload at least one habits CSV file to continue.');
      return;
    }

    setIsHabitImportLoading(true);
    setHabitImportMessage(null);

    try {
      const [definitionsData, logsData] = await Promise.all([
        habitDefinitionsFile ? fileToBase64(habitDefinitionsFile) : Promise.resolve(undefined),
        habitLogsFile ? fileToBase64(habitLogsFile) : Promise.resolve(undefined)
      ]);

      const conflictResolutions = Object.entries(habitConflictResolutions).map(([habitName, resolution]) => ({
        habitName,
        resolution
      }));

      const response = await importApi.confirmHabitImport({
        definitionsData,
        logsData,
        conflictResolutions
      });

      setHabitImportResult(response.data as HabitImportResult);
      setHabitImportStep('result');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['habits'] }),
        queryClient.invalidateQueries({ queryKey: ['habit-logs'] })
      ]);
    } catch {
      setHabitImportMessage('Unable to complete habit import. Please review your files and try again.');
    } finally {
      setIsHabitImportLoading(false);
    }
  };

  const unresolvedHabitNames = useMemo(() => {
    const unresolvedFromLogs = habitLogsPreview?.unresolvedHabits ?? [];
    if (!unresolvedFromLogs.length) {
      return [] as string[];
    }

    const incomingHabits = new Set(habitDefinitionsPreview?.newHabits ?? []);
    return unresolvedFromLogs.filter((name) => !incomingHabits.has(name));
  }, [habitDefinitionsPreview?.newHabits, habitLogsPreview?.unresolvedHabits]);

  return (
    <section className="space-y-4">
      {profileToast ? (
        <div className="fixed right-4 top-4 z-40 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success">
          {profileToast}
        </div>
      ) : null}

      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card title="Account">
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={profile.displayName}
            onChange={(event) => {
              setField('displayName', event.target.value);
              setProfileMessage(null);
            }}
            placeholder="Enter display name"
          />

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Profile &amp; Biometrics</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Age"
                type="number"
                min={11}
                max={120}
                unit="years"
                value={profile.age}
                onChange={(event) => {
                  setField('age', event.target.value);
                  setProfileErrors((current) => ({ ...current, age: undefined }));
                  setProfileMessage(null);
                }}
                placeholder="e.g. 28"
                error={profileErrors.age}
              />

              <Input
                label="Weight"
                type="number"
                min={1}
                step="0.1"
                unit={weightUnit === 'kg' ? 'kg' : 'lbs'}
                value={weightUnit === 'kg' ? profile.weightKg : profile.weightLbs}
                onChange={(event) => {
                  if (weightUnit === 'kg') {
                    handleWeightKgChange(event.target.value);
                    return;
                  }
                  handleWeightLbsChange(event.target.value);
                }}
                placeholder={weightUnit === 'kg' ? 'e.g. 72.5' : 'e.g. 160'}
                labelAction={
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      className={unitToggleButtonClass(weightUnit === 'kg')}
                      onClick={() => handleWeightUnitChange('kg')}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={unitToggleButtonClass(weightUnit === 'lbs')}
                      onClick={() => handleWeightUnitChange('lbs')}
                    >
                      lbs
                    </button>
                  </div>
                }
              />

              {heightUnit === 'cm' ? (
                <Input
                  label="Height"
                  type="number"
                  min={100}
                  max={250}
                  step="0.1"
                  unit="cm"
                  value={profile.heightCm}
                  onChange={(event) => {
                    handleHeightCmChange(event.target.value);
                  }}
                  placeholder="e.g. 175"
                  error={profileErrors.heightCm}
                  labelAction={
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        className={unitToggleButtonClass(heightUnit === 'cm')}
                        onClick={() => handleHeightUnitChange('cm')}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        className={unitToggleButtonClass(false)}
                        onClick={() => handleHeightUnitChange('ftin')}
                      >
                        ft/in
                      </button>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-slate-700">Height</label>
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        className={unitToggleButtonClass(false)}
                        onClick={() => handleHeightUnitChange('cm')}
                      >
                        cm
                      </button>
                      <button
                        type="button"
                        className={unitToggleButtonClass(true)}
                        onClick={() => handleHeightUnitChange('ftin')}
                      >
                        ft/in
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Feet"
                      type="number"
                      min={3}
                      max={8}
                      step="1"
                      value={profile.heightFt}
                      onChange={(event) => {
                        handleHeightFeetChange(event.target.value);
                      }}
                      placeholder="5"
                    />
                    <Input
                      label="Inches"
                      type="number"
                      min={0}
                      max={11}
                      step="0.5"
                      value={profile.heightIn}
                      onChange={(event) => {
                        handleHeightInchesChange(event.target.value);
                      }}
                      placeholder="9"
                    />
                  </div>
                  {profileErrors.heightCm ? <p className="text-sm text-danger">{profileErrors.heightCm}</p> : null}
                </div>
              )}

              <Select
                label="Gender"
                options={GENDER_OPTIONS}
                value={profile.gender}
                onChange={(event) => {
                  setField('gender', event.target.value as UserGender | '');
                  setProfileMessage(null);
                }}
              />

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Activity Level</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {LIFESTYLE_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setField('activityLevel', option.value)}
                      className={`rounded-xl border-2 p-4 text-left transition-colors ${
                        profile.activityLevel === option.value
                          ? 'border-accent-500 bg-accent-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-semibold text-gray-800 text-sm">{option.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Calorie Target</h3>

            <Input
              label="Custom Daily Calorie Target"
              type="number"
              min={500}
              max={10000}
              unit="kcal/day"
              value={profile.calorieTarget}
              onChange={(event) => {
                setField('calorieTarget', event.target.value);
                setSelectedPreset(null);
              }}
              placeholder="e.g. 1800"
            />

            {showSurplusWarning ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                Your target is above your maintenance calories. This is a caloric surplus and will likely result in weight gain over time.
              </div>
            ) : showAggressiveWarning ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                This is a heavy cut. Make sure you're keeping protein high to preserve muscle.
              </div>
            ) : null}

            {canShowWizard ? (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-900">Preset Targets</h4>

                <div className="mt-3 space-y-4">
                  {maintenance !== null ? (
                    <div className="rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
                      <p className="text-sm font-medium text-accent-800">Your estimated maintenance: {maintenance} kcal/day</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Based on your lifestyle only - exercise calories are added on top via habits.
                      </p>
                    </div>
                  ) : null}

                  {maintenance !== null ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {DEFICIT_PRESETS.map((preset) => {
                        const presetTarget = maintenance - preset.deficitKcal;
                        const isSelected = selectedPreset === preset.deficitKcal;

                        return (
                          <button
                            key={preset.label}
                            type="button"
                            className={`rounded-xl border p-3 text-left transition ${
                              isSelected
                                ? 'border-accent-500 bg-accent-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => {
                              handlePresetSelect(preset.deficitKcal);
                            }}
                          >
                            <p className="font-semibold text-slate-900">{preset.label}</p>
                            <p className="mt-1 text-sm text-slate-600">~{preset.weeklyLossKg} kg/week loss</p>
                            <p className="mt-1 text-sm text-slate-700">Target: {presetTarget} kcal/day</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-200 pt-4">
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                  Fill in your age, gender, height, weight, and activity level above to unlock preset targets.
                </div>
              </div>
            )}
          </div>

          <Input label="Email" value={user?.email ?? ''} readOnly />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                void handleSaveProfile();
              }}
              loading={updateProfileMutation.isPending}
            >
              Save Profile
            </Button>

            <Button variant="secondary" onClick={() => void signOut()}>
              Sign Out
            </Button>

            {profileMessage ? <span className="text-sm text-danger">{profileMessage}</span> : null}
          </div>
        </div>
      </Card>

      <Card title="Data Export">
        <p className="text-sm text-slate-600">Download your logs as a ZIP archive.</p>
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            disabled={isExporting}
          >
            {isExporting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" className="text-white" />
                Exporting...
              </span>
            ) : (
              'Export All Data'
            )}
          </Button>
          {exportMessage ? <span className="text-sm text-slate-600">{exportMessage}</span> : null}
        </div>
      </Card>

      <Card title="Data Import">
        <div className="space-y-4">
          {importStep === 'upload' ? (
            <div className="space-y-3">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => {
                  setIsDraggingFile(false);
                }}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-6 text-center ${isDraggingFile ? 'border-accent-500 bg-accent-50' : 'border-slate-300 bg-slate-50'}`}
              >
                <p className="text-sm text-slate-700">Drag and drop a CSV file here</p>
                <p className="mt-1 text-xs text-slate-500">Only .csv files are supported</p>

                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    title="Select CSV file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFileSelected(file);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    disabled={isImporting}
                  >
                    Browse files
                  </Button>
                </div>
              </div>

              {isImporting ? (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Spinner size="sm" />
                  <span>Uploading and analyzing CSV...</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void handleDownloadImportTemplate();
                }}
                disabled={isTemplateDownloading}
                className="text-sm text-slate-600 underline hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download import template
              </button>
            </div>
          ) : null}

          {importStep === 'formatWarning' ? (
            <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg" aria-hidden="true">⚠</span>
                <div>
                  <h4 className="text-base font-semibold text-amber-900">Unrecognised File Format</h4>
                  <p className="mt-1 text-sm text-amber-800">
                    We couldn't recognise the columns in your file. It may be missing required columns or using different column names than expected.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <h5 className="text-sm font-semibold text-slate-900">Required columns check</h5>
                <ul className="mt-2 space-y-1 text-sm">
                  {requiredColumnStatus.map((column) => (
                    <li
                      key={column.name}
                      className={column.detected ? 'text-green-700' : 'text-red-700'}
                    >
                      <span className="mr-2" aria-hidden="true">
                        {column.detected ? '✓' : '✕'}
                      </span>
                      {column.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    void handleDownloadImportTemplate();
                  }}
                  disabled={isTemplateDownloading}
                >
                  Download Template
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setImportStep('mapping');
                  }}
                >
                  Continue Anyway — Map Columns Manually
                </Button>

                <button
                  type="button"
                  className="text-sm text-slate-700 underline hover:text-slate-900"
                  onClick={resetImportFlow}
                >
                  Upload a Different File
                </button>
              </div>
            </div>
          ) : null}

          {importStep === 'mapping' && importPreview ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Step 2: Column Mapping</h4>
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">CSV Column</th>
                        <th className="px-3 py-2 font-medium">Map To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {detectedColumns.map((columnName) => (
                        <tr key={columnName}>
                          <td className="px-3 py-2 text-slate-800">{columnName}</td>
                          <td className="px-3 py-2">
                            <Select
                              label={`Map ${columnName}`}
                              options={APP_FIELD_OPTIONS}
                              value={columnMapping[columnName] ?? '__ignore__'}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setColumnMapping((current) => ({
                                  ...current,
                                  [columnName]: nextValue
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900">Preview (first 5 rows)</h4>
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        {detectedColumns.map((columnName) => (
                          <th key={columnName} className="px-3 py-2 font-medium">
                            {columnName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewRows.map((row, index) => (
                        <tr key={index}>
                          {detectedColumns.map((columnName) => (
                            <td key={columnName} className="px-3 py-2 text-slate-700">
                              {row[columnName] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    void handleConfirmMapping();
                  }}
                  loading={isImporting}
                >
                  Confirm Mapping
                </Button>
                <Button type="button" variant="secondary" onClick={resetImportFlow}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {importStep === 'conflicts' ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">Step 3: Conflict Resolution</h4>
              <p className="text-sm text-slate-600">Conflicting dates were found. Choose how to proceed.</p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">CSV Row</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {uniqueConflictRows.map((conflict) => (
                      <tr key={`${conflict.row}-${conflict.date}`}>
                        <td className="px-3 py-2">{conflict.row}</td>
                        <td className="px-3 py-2">{conflict.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handleResolveConflicts('skip');
                  }}
                  loading={isImporting}
                >
                  Skip All Conflicts
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void handleResolveConflicts('overwrite');
                  }}
                  loading={isImporting}
                >
                  Overwrite All
                </Button>
              </div>
            </div>
          ) : null}

          {importStep === 'result' && importResult ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                Successfully imported {importResult.imported} rows. Skipped {importResult.skipped} rows.
              </div>
              <Button type="button" variant="secondary" onClick={resetImportFlow}>
                Import Another File
              </Button>
            </div>
          ) : null}

          {importMessage ? <p className="text-sm text-danger">{importMessage}</p> : null}

          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-base font-semibold text-slate-900">Import Habits</h3>

            {habitImportStep === 'upload' ? (
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingDefinitionsFile(true);
                    }}
                    onDragLeave={() => {
                      setIsDraggingDefinitionsFile(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDraggingDefinitionsFile(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file) {
                        handleHabitFileSelected('definitions', file);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-5 text-center ${
                      isDraggingDefinitionsFile
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">Habit Definitions (habit_definitions.csv)</p>
                    <p className="mt-1 text-xs text-slate-500">Optional</p>
                    <input
                      ref={habitDefinitionsInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleHabitFileSelected('definitions', file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => {
                        habitDefinitionsInputRef.current?.click();
                      }}
                    >
                      Choose file
                    </Button>
                    {habitDefinitionsFile ? (
                      <p className="mt-2 text-xs text-slate-600">{habitDefinitionsFile.name}</p>
                    ) : null}
                  </div>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingHabitLogsFile(true);
                    }}
                    onDragLeave={() => {
                      setIsDraggingHabitLogsFile(false);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDraggingHabitLogsFile(false);
                      const file = event.dataTransfer.files?.[0];
                      if (file) {
                        handleHabitFileSelected('logs', file);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-5 text-center ${
                      isDraggingHabitLogsFile
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-800">Habit Logs (habit_logs.csv)</p>
                    <p className="mt-1 text-xs text-slate-500">Optional</p>
                    <input
                      ref={habitLogsInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleHabitFileSelected('logs', file);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => {
                        habitLogsInputRef.current?.click();
                      }}
                    >
                      Choose file
                    </Button>
                    {habitLogsFile ? (
                      <p className="mt-2 text-xs text-slate-600">{habitLogsFile.name}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      void handlePreviewHabitImport();
                    }}
                    loading={isHabitImportLoading}
                    disabled={!habitDefinitionsFile && !habitLogsFile}
                  >
                    Preview Import
                  </Button>

                  {habitImportMessage ? <span className="text-sm text-danger">{habitImportMessage}</span> : null}
                </div>
              </div>
            ) : null}

            {habitImportStep === 'conflicts' ? (
              <div className="mt-3 space-y-4">
                {habitDefinitionsPreview?.conflicts?.length ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">Step 2: Conflict resolution</h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-slate-600">
                          <tr>
                            <th className="px-3 py-2 font-medium">Habit Name</th>
                            <th className="px-3 py-2 font-medium">Existing</th>
                            <th className="px-3 py-2 font-medium">Incoming</th>
                            <th className="px-3 py-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {habitDefinitionsPreview.conflicts.map((conflict) => (
                            <tr key={conflict.habitName}>
                              <td className="px-3 py-2 font-medium text-slate-900">{conflict.habitName}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                <p>{conflict.existingHabit.habitType}</p>
                                <p>{conflict.existingHabit.frequencyType}</p>
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                <p>{conflict.incomingHabit.habitType}</p>
                                <p>{conflict.incomingHabit.frequencyType}</p>
                              </td>
                              <td className="px-3 py-2">
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="radio"
                                      name={`resolution-${conflict.habitName}`}
                                      checked={(habitConflictResolutions[conflict.habitName] ?? 'link') === 'link'}
                                      onChange={() => handleConflictResolutionChange(conflict.habitName, 'link')}
                                    />
                                    Keep existing
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="radio"
                                      name={`resolution-${conflict.habitName}`}
                                      checked={habitConflictResolutions[conflict.habitName] === 'create_new'}
                                      onChange={() => handleConflictResolutionChange(conflict.habitName, 'create_new')}
                                    />
                                    Create new copy
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="radio"
                                      name={`resolution-${conflict.habitName}`}
                                      checked={habitConflictResolutions[conflict.habitName] === 'overwrite'}
                                      onChange={() => handleConflictResolutionChange(conflict.habitName, 'overwrite')}
                                    />
                                    Update definition
                                  </label>
                                  <p className="text-xs text-slate-500">Tuned fields (target, calorie rates) are preserved</p>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {habitDefinitionsPreview?.newHabits?.length ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {habitDefinitionsPreview.newHabits.length} new habits will be created: {habitDefinitionsPreview.newHabits.join(', ')}
                  </div>
                ) : null}

                {unresolvedHabitNames.length > 0 && !habitDefinitionsFile ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    These habit names in your logs file were not found: {unresolvedHabitNames.join(', ')}. Their logs will be skipped. Upload a habit_definitions.csv to create them.
                  </div>
                ) : null}

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      void handleConfirmHabitImport();
                    }}
                    loading={isHabitImportLoading}
                  >
                    Confirm Import
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetHabitImportFlow}>
                    Cancel
                  </Button>
                </div>

                {habitImportMessage ? <p className="text-sm text-danger">{habitImportMessage}</p> : null}
              </div>
            ) : null}

            {habitImportStep === 'result' && habitImportResult ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                  <p className="font-semibold">✓ Import complete</p>
                  <p>{habitImportResult.habitsCreated} habits created</p>
                  <p>{habitImportResult.habitsUpdated} habits updated</p>
                  <p>{habitImportResult.habitsLinked} habits linked to existing</p>
                  <p>{habitImportResult.logsImported} habit logs imported</p>
                  <p>{habitImportResult.logsSkipped} habit logs skipped</p>
                </div>

                <Button type="button" variant="secondary" onClick={resetHabitImportFlow}>
                  Import Another File
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </section>
  );
};

export default SettingsPage;
