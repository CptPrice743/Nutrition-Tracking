import { useMemo, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';
import { importApi, usersApi } from '../lib/api';
import type { CsvImportConflict, CsvImportPreview, CsvImportResult } from '../types';

type ImportStep = 'upload' | 'formatWarning' | 'mapping' | 'conflicts' | 'result';

type AppFieldOption = {
  value: string;
  label: string;
};

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
  { value: 'magnesium_mg', label: 'Magnesium (mg)' },
  { value: 'iron_mg', label: 'Iron (mg)' },
  { value: 'zinc_mg', label: 'Zinc (mg)' },
  { value: 'water_litres', label: 'Water (L)' },
  { value: 'day_type', label: 'Day Type' },
  { value: 'notes', label: 'Notes' }
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

const conflictRowsFromResult = (result: CsvImportResult): CsvImportConflict[] => {
  return result.conflicts ?? [];
};

const SettingsPage = (): JSX.Element => {
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

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

  const hasImportFile = importFile !== null;

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

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      await usersApi.updateMe(displayName.trim());
      setProfileMessage('Profile updated.');
    } catch {
      setProfileMessage('Unable to save profile right now.');
    } finally {
      setIsSavingProfile(false);
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
      link.download = 'nutrilog-import-template.csv';
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

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card title="Account">
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setProfileMessage(null);
            }}
            placeholder="Enter display name"
          />

          <Input label="Email" value={user?.email ?? ''} readOnly />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={() => {
                void handleSaveProfile();
              }}
              loading={isSavingProfile}
            >
              Save
            </Button>

            <Button variant="secondary" onClick={() => void signOut()}>
              Sign Out
            </Button>

            {profileMessage ? <span className="text-sm text-slate-600">{profileMessage}</span> : null}
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
        </div>
      </Card>
    </section>
  );
};

export default SettingsPage;
