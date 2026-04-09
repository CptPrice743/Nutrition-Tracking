import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  const unitToggleButtonClass = (selected: boolean): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    background: selected ? 'var(--primary)' : 'var(--surface-container-low)',
    color: selected ? '#ffffff' : 'var(--text-secondary)',
    transition: 'background var(--transition), color var(--transition)'
  });

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

  const bmr = canShowWizard
    ? calculateBMR({
        gender: profile.gender as 'male' | 'female' | 'other',
        weightKg: weightKgForCalc!,
        heightCm: heightCmForCalc!,
        age: Number(profile.age)
      })
    : null;

  const initials = (profile.displayName || user?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page-container">
      {/* Toast */}
      {profileToast ? (
        <div style={{
          position: 'fixed', right: 20, top: 20, zIndex: 50,
          background: 'var(--success-bg)', color: 'var(--success-text)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-lg)', padding: '8px 16px',
          fontSize: 14, fontWeight: 600
        }}>
          ✓ {profileToast}
        </div>
      ) : null}

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <span className="page-eyebrow">Configuration</span>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="headline">Settings</h1>
          <Button
            type="button"
            onClick={() => { void handleSaveProfile(); }}
            loading={updateProfileMutation.isPending}
          >
            Save Profile
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:!grid-cols-[3fr_2fr]">

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile card */}
          <div className="card">
            <h2 className="title" style={{ marginBottom: 20 }}>Profile</h2>

            {/* Avatar + name row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, flexShrink: 0
              }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Display Name"
                  value={profile.displayName}
                  onChange={(event) => {
                    setField('displayName', event.target.value);
                    setProfileMessage(null);
                  }}
                  placeholder="Enter display name"
                />
              </div>
            </div>

            {/* Fields grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Age */}
              <Input
                label="Age"
                type="number"
                min={11}
                max={120}
                unit="yrs"
                value={profile.age}
                onChange={(event) => {
                  setField('age', event.target.value);
                  setProfileErrors((current) => ({ ...current, age: undefined }));
                  setProfileMessage(null);
                }}
                placeholder="28"
                error={profileErrors.age}
              />

              {/* Weight with unit toggle */}
              <Input
                label="Weight"
                type="number"
                min={1}
                step="0.1"
                unit={weightUnit === 'kg' ? 'kg' : 'lbs'}
                value={weightUnit === 'kg' ? profile.weightKg : profile.weightLbs}
                onChange={(event) => {
                  if (weightUnit === 'kg') { handleWeightKgChange(event.target.value); return; }
                  handleWeightLbsChange(event.target.value);
                }}
                placeholder={weightUnit === 'kg' ? '72.5' : '160'}
                labelAction={
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button type="button" style={unitToggleButtonClass(weightUnit === 'kg')} onClick={() => handleWeightUnitChange('kg')}>kg</button>
                    <button type="button" style={unitToggleButtonClass(weightUnit === 'lbs')} onClick={() => handleWeightUnitChange('lbs')}>lbs</button>
                  </div>
                }
              />

              {/* Gender */}
              <Select
                label="Gender"
                options={GENDER_OPTIONS}
                value={profile.gender}
                onChange={(event) => {
                  setField('gender', event.target.value as UserGender | '');
                  setProfileMessage(null);
                }}
              />

              {/* Height with unit toggle */}
              {heightUnit === 'cm' ? (
                <Input
                  label="Height"
                  type="number"
                  min={100}
                  max={250}
                  step="0.1"
                  unit="cm"
                  value={profile.heightCm}
                  onChange={(event) => { handleHeightCmChange(event.target.value); }}
                  placeholder="175"
                  error={profileErrors.heightCm}
                  labelAction={
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button type="button" style={unitToggleButtonClass(true)} onClick={() => handleHeightUnitChange('cm')}>cm</button>
                      <button type="button" style={unitToggleButtonClass(false)} onClick={() => handleHeightUnitChange('ftin')}>ft/in</button>
                    </div>
                  }
                />
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="field-label" style={{ margin: 0 }}>Height</label>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      <button type="button" style={unitToggleButtonClass(false)} onClick={() => handleHeightUnitChange('cm')}>cm</button>
                      <button type="button" style={unitToggleButtonClass(true)} onClick={() => handleHeightUnitChange('ftin')}>ft/in</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Input
                      label="Feet"
                      type="number"
                      min={3}
                      max={8}
                      step="1"
                      value={profile.heightFt}
                      onChange={(event) => { handleHeightFeetChange(event.target.value); }}
                      placeholder="5"
                    />
                    <Input
                      label="Inches"
                      type="number"
                      min={0}
                      max={11}
                      step="0.5"
                      value={profile.heightIn}
                      onChange={(event) => { handleHeightInchesChange(event.target.value); }}
                      placeholder="9"
                    />
                  </div>
                  {profileErrors.heightCm ? (
                    <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{profileErrors.heightCm}</p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Activity Level */}
            <div style={{ marginTop: 16 }}>
              <label className="field-label">Activity Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginTop: 6 }}>
                {LIFESTYLE_OPTIONS.map((option) => {
                  const isActive = profile.activityLevel === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setField('activityLevel', option.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-lg)',
                        border: `2px solid ${isActive ? 'var(--primary)' : 'var(--surface-container-low)'}`,
                        background: isActive ? 'var(--primary-dim)' : 'var(--surface-container)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'border-color var(--transition), background var(--transition)'
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--primary)' : 'var(--text-primary)', marginBottom: 2 }}>{option.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.3 }}>{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {profileMessage ? (
              <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 12 }}>{profileMessage}</p>
            ) : null}
          </div>

          {/* Calorie Target hero card */}
          <div className="card-hero" style={{ padding: 24 }}>
            <div className="overline" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Daily Calorie Target</div>
            <div className="display" style={{ color: '#fff', lineHeight: 1, marginBottom: 4 }}>
              {profile.calorieTarget !== '' ? Number(profile.calorieTarget).toLocaleString() : '–'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>kcal / day</div>

            {/* Warnings */}
            {showSurplusWarning ? (
              <div style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13,
                color: '#fca5a5', marginBottom: 16
              }}>
                ↑ Target is above maintenance — caloric surplus, expect weight gain.
              </div>
            ) : showAggressiveWarning ? (
              <div style={{
                background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13,
                color: '#fcd34d', marginBottom: 16
              }}>
                ⚡ Aggressive cut. Keep protein high to preserve muscle.
              </div>
            ) : null}

            {/* Maintenance + BMR stats */}
            {canShowWizard && maintenance !== null ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Maintenance</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{maintenance.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>kcal/day</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>BMR</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{bmr !== null ? Math.round(bmr).toLocaleString() : '–'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>kcal/day</div>
                </div>
              </div>
            ) : !canShowWizard ? (
              <div style={{
                background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13,
                color: 'rgba(147,197,253,0.9)', marginBottom: 16
              }}>
                Fill in age, gender, height, weight &amp; activity level to unlock preset targets.
              </div>
            ) : null}

            {/* Preset buttons */}
            {canShowWizard && maintenance !== null ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }} className="md:!grid-cols-4">
                {DEFICIT_PRESETS.map((preset) => {
                  const presetTarget = maintenance - preset.deficitKcal;
                  const isSelected = selectedPreset === preset.deficitKcal;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => { handlePresetSelect(preset.deficitKcal); }}
                      style={{
                        padding: '10px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
                        background: isSelected ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.06)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'border-color var(--transition), background var(--transition)'
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 700, color: isSelected ? 'var(--primary-light)' : 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{preset.label}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>~{preset.weeklyLossKg}kg/wk</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>{presetTarget.toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Custom target input */}
            <div>
              <label className="field-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Custom Target</label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <input
                  className="input"
                  type="number"
                  min={500}
                  max={10000}
                  value={profile.calorieTarget}
                  onChange={(event) => {
                    setField('calorieTarget', event.target.value);
                    setSelectedPreset(null);
                  }}
                  placeholder="e.g. 1800"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    paddingRight: 72
                  }}
                />
                <span style={{
                  position: 'absolute', right: 12, top: 0, bottom: 0,
                  display: 'flex', alignItems: 'center',
                  fontSize: 12, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none'
                }}>kcal/day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Data Import/Export card */}
          <div className="card">
            <h2 className="title" style={{ marginBottom: 16 }}>Data</h2>

            {/* Export */}
            <div style={{ marginBottom: 20 }}>
              <div className="overline" style={{ marginBottom: 10 }}>Export</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Download all your logs as a ZIP archive.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { void handleExport(); }}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Spinner size="sm" />
                      Exporting...
                    </span>
                  ) : '↓ Export All Data'}
                </Button>
                {exportMessage ? <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{exportMessage}</span> : null}
              </div>
            </div>

            {/* Nutrition Import */}
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--surface-container-low)', marginBottom: 20 }}>
              <div className="overline" style={{ marginBottom: 10 }}>Import Nutrition Logs</div>

              {importStep === 'upload' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={() => { setIsDraggingFile(false); }}
                    onDrop={handleDrop}
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: `2px dashed ${isDraggingFile ? 'var(--primary)' : 'var(--surface-container-low)'}`,
                      background: isDraggingFile ? 'var(--primary-dim)' : 'var(--surface-container)',
                      padding: '20px 16px',
                      textAlign: 'center',
                      transition: 'border-color var(--transition), background var(--transition)'
                    }}
                  >
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>Drag &amp; drop CSV here</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>or</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      title="Select CSV file"
                      style={{ display: 'none' }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) { void handleFileSelected(file); }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginTop: 8, fontSize: 13 }}
                      onClick={() => { fileInputRef.current?.click(); }}
                      disabled={isImporting}
                    >
                      Browse files
                    </button>
                  </div>

                  {isImporting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <Spinner size="sm" />
                      Analyzing CSV...
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => { void handleDownloadImportTemplate(); }}
                    disabled={isTemplateDownloading}
                    style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, textDecoration: 'underline' }}
                  >
                    Download import template
                  </button>
                </div>
              ) : null}

              {importStep === 'formatWarning' ? (
                <div style={{
                  background: 'var(--warning-bg)', border: '1px solid var(--warning)',
                  borderRadius: 'var(--radius-lg)', padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <span>⚠</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning-text)', marginBottom: 4 }}>Unrecognised Format</p>
                      <p style={{ fontSize: 12, color: 'var(--warning-text)' }}>Missing or misnamed columns.</p>
                    </div>
                  </div>
                  <ul style={{ fontSize: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {requiredColumnStatus.map((col) => (
                      <li key={col.name} style={{ color: col.detected ? 'var(--success-text)' : 'var(--danger-text)' }}>
                        {col.detected ? '✓' : '✕'} {col.name}
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { void handleDownloadImportTemplate(); }} disabled={isTemplateDownloading}>Download Template</button>
                    <button type="button" className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setImportStep('mapping'); }}>Map Manually</button>
                    <button type="button" style={{ fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline' }} onClick={resetImportFlow}>Try Different File</button>
                  </div>
                </div>
              ) : null}

              {importStep === 'mapping' && importPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p className="overline" style={{ marginBottom: 0 }}>Step 2: Column Mapping</p>
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container-low)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-container-low)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>CSV Column</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Maps To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detectedColumns.map((columnName) => (
                          <tr key={columnName} style={{ borderTop: '1px solid var(--surface-container-low)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{columnName}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <Select
                                label={`Map ${columnName}`}
                                options={APP_FIELD_OPTIONS}
                                value={columnMapping[columnName] ?? '__ignore__'}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  setColumnMapping((current) => ({ ...current, [columnName]: nextValue }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button type="button" onClick={() => { void handleConfirmMapping(); }} loading={isImporting}>Confirm Mapping</Button>
                    <Button type="button" variant="secondary" onClick={resetImportFlow}>Cancel</Button>
                  </div>
                </div>
              ) : null}

              {importStep === 'conflicts' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p className="overline" style={{ marginBottom: 0 }}>Step 3: Conflict Resolution</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Conflicting dates found. Choose how to proceed.</p>
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container-low)', maxHeight: 200, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-container-low)' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Row</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueConflictRows.map((conflict) => (
                          <tr key={`${conflict.row}-${conflict.date}`} style={{ borderTop: '1px solid var(--surface-container-low)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{conflict.row}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{conflict.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Button type="button" variant="secondary" onClick={() => { void handleResolveConflicts('skip'); }} loading={isImporting}>Skip Conflicts</Button>
                    <Button type="button" onClick={() => { void handleResolveConflicts('overwrite'); }} loading={isImporting}>Overwrite All</Button>
                  </div>
                </div>
              ) : null}

              {importStep === 'result' && importResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    background: 'var(--success-bg)', border: '1px solid var(--success)',
                    borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13,
                    color: 'var(--success-text)'
                  }}>
                    ✓ Imported {importResult.imported} rows. Skipped {importResult.skipped} rows.
                  </div>
                  <Button type="button" variant="secondary" onClick={resetImportFlow}>Import Another File</Button>
                </div>
              ) : null}

              {importMessage ? <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{importMessage}</p> : null}
            </div>

            {/* Habits Import */}
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--surface-container-low)' }}>
              <div className="overline" style={{ marginBottom: 10 }}>Import Habits</div>

              {habitImportStep === 'upload' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {/* Definitions drop zone */}
                    <div
                      onDragOver={(event) => { event.preventDefault(); setIsDraggingDefinitionsFile(true); }}
                      onDragLeave={() => { setIsDraggingDefinitionsFile(false); }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingDefinitionsFile(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) { handleHabitFileSelected('definitions', file); }
                      }}
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: `2px dashed ${isDraggingDefinitionsFile ? 'var(--primary)' : 'var(--surface-container-low)'}`,
                        background: isDraggingDefinitionsFile ? 'var(--primary-dim)' : 'var(--surface-container)',
                        padding: '16px 10px', textAlign: 'center',
                        transition: 'border-color var(--transition), background var(--transition)'
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Definitions</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>habit_definitions.csv</p>
                      <input
                        ref={habitDefinitionsInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) { handleHabitFileSelected('definitions', file); }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => { habitDefinitionsInputRef.current?.click(); }}
                      >
                        Choose
                      </button>
                      {habitDefinitionsFile ? (
                        <p style={{ fontSize: 11, color: 'var(--success-text)', marginTop: 6 }}>✓ {habitDefinitionsFile.name}</p>
                      ) : null}
                    </div>

                    {/* Logs drop zone */}
                    <div
                      onDragOver={(event) => { event.preventDefault(); setIsDraggingHabitLogsFile(true); }}
                      onDragLeave={() => { setIsDraggingHabitLogsFile(false); }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDraggingHabitLogsFile(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) { handleHabitFileSelected('logs', file); }
                      }}
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: `2px dashed ${isDraggingHabitLogsFile ? 'var(--primary)' : 'var(--surface-container-low)'}`,
                        background: isDraggingHabitLogsFile ? 'var(--primary-dim)' : 'var(--surface-container)',
                        padding: '16px 10px', textAlign: 'center',
                        transition: 'border-color var(--transition), background var(--transition)'
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Habit Logs</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8 }}>habit_logs.csv</p>
                      <input
                        ref={habitLogsInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) { handleHabitFileSelected('logs', file); }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => { habitLogsInputRef.current?.click(); }}
                      >
                        Choose
                      </button>
                      {habitLogsFile ? (
                        <p style={{ fontSize: 11, color: 'var(--success-text)', marginTop: 6 }}>✓ {habitLogsFile.name}</p>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button
                      type="button"
                      onClick={() => { void handlePreviewHabitImport(); }}
                      loading={isHabitImportLoading}
                      disabled={!habitDefinitionsFile && !habitLogsFile}
                    >
                      Preview Import
                    </Button>
                    {habitImportMessage ? <span style={{ fontSize: 12, color: 'var(--danger)' }}>{habitImportMessage}</span> : null}
                  </div>
                </div>
              ) : null}

              {habitImportStep === 'conflicts' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {habitDefinitionsPreview?.conflicts?.length ? (
                    <div>
                      <p className="overline" style={{ marginBottom: 8 }}>Step 2: Conflict Resolution</p>
                      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-container-low)', maxHeight: 240, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-container-low)' }}>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Habit</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {habitDefinitionsPreview.conflicts.map((conflict) => (
                              <tr key={conflict.habitName} style={{ borderTop: '1px solid var(--surface-container-low)' }}>
                                <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>{conflict.habitName}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {(['link', 'create_new', 'overwrite'] as ConflictResolution[]).map((res) => (
                                      <label key={res} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input
                                          type="radio"
                                          name={`resolution-${conflict.habitName}`}
                                          checked={(habitConflictResolutions[conflict.habitName] ?? 'link') === res}
                                          onChange={() => handleConflictResolutionChange(conflict.habitName, res)}
                                        />
                                        {res === 'link' ? 'Keep existing' : res === 'create_new' ? 'Create copy' : 'Update definition'}
                                      </label>
                                    ))}
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
                    <div style={{
                      background: 'var(--surface-container)', borderRadius: 'var(--radius-md)',
                      padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)'
                    }}>
                      {habitDefinitionsPreview.newHabits.length} new habits: {habitDefinitionsPreview.newHabits.join(', ')}
                    </div>
                  ) : null}

                  {unresolvedHabitNames.length > 0 && !habitDefinitionsFile ? (
                    <div style={{
                      background: 'var(--warning-bg)', border: '1px solid var(--warning)',
                      borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 12, color: 'var(--warning-text)'
                    }}>
                      ⚠ Unresolved: {unresolvedHabitNames.join(', ')}. Upload definitions CSV to create them.
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button type="button" onClick={() => { void handleConfirmHabitImport(); }} loading={isHabitImportLoading}>Confirm Import</Button>
                    <Button type="button" variant="secondary" onClick={resetHabitImportFlow}>Cancel</Button>
                  </div>
                  {habitImportMessage ? <p style={{ fontSize: 12, color: 'var(--danger)' }}>{habitImportMessage}</p> : null}
                </div>
              ) : null}

              {habitImportStep === 'result' && habitImportResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    background: 'var(--success-bg)', border: '1px solid var(--success)',
                    borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13,
                    color: 'var(--success-text)', display: 'flex', flexDirection: 'column', gap: 2
                  }}>
                    <p style={{ fontWeight: 700 }}>✓ Import complete</p>
                    <p>{habitImportResult.habitsCreated} habits created</p>
                    <p>{habitImportResult.habitsUpdated} habits updated</p>
                    <p>{habitImportResult.habitsLinked} habits linked</p>
                    <p>{habitImportResult.logsImported} logs imported</p>
                    <p>{habitImportResult.logsSkipped} logs skipped</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={resetHabitImportFlow}>Import Another File</Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Account card */}
          <div className="card">
            <h2 className="title" style={{ marginBottom: 16 }}>Account</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="field-label">Email</label>
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-container)', fontSize: 14,
                  color: 'var(--text-secondary)', marginTop: 6
                }}>
                  {user?.email ?? '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--danger)',
                  background: 'transparent',
                  color: 'var(--danger)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background var(--transition)',
                  textAlign: 'center'
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
