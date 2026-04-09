import archiver from 'archiver';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify';
import type { Prisma } from '@prisma/client';
import { PassThrough } from 'stream';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import {
	habitImportConfirmSchema,
	habitImportRowSchema,
	habitLogImportRowSchema
} from '../schemas/habits';
import { dailyLogCreateSchema } from '../schemas/logs';

type ParsedCsvRow = Record<string, string>;

type PreviewResult = {
	detectedColumns: string[];
	previewRows: ParsedCsvRow[];
	suggestedMappings: Record<string, string | null>;
	formatValid: boolean;
};

type ConfirmInput = {
	columnMapping: Record<string, string>;
	csvBase64?: string;
	csvData?: string;
	conflictResolution?: 'overwrite' | 'skip';
};

type ConflictRow = {
	row: number;
	date: string;
	action: 'overwrite' | 'skip';
};

type ConfirmResult = {
	imported: number;
	skipped: number;
	conflicts: ConflictRow[];
};

type HabitConflictResolution = 'link' | 'create_new' | 'overwrite';

type HabitDefinitionPreviewConflict = {
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
		habitType: 'count' | 'boolean';
		frequencyType: 'daily' | 'weekly' | 'monthly' | 'x_per_week' | 'x_per_month' | 'x_in_y_days';
		targetValue: number | undefined;
		isCalorieBurning: boolean;
	};
};

type HabitDefinitionsPreviewResult = {
	totalRows: number;
	validRows: number;
	errors: { row: number; message: string }[];
	conflicts: HabitDefinitionPreviewConflict[];
	newHabits: string[];
};

type HabitLogsPreviewResult = {
	totalRows: number;
	validRows: number;
	errors: { row: number; message: string }[];
	unresolvedHabits: string[];
	resolvedHabits: string[];
};

type HabitImportConfirmInput = z.infer<typeof habitImportConfirmSchema>;

type HabitImportConfirmResult = {
	habitsCreated: number;
	habitsUpdated: number;
	habitsLinked: number;
	logsImported: number;
	logsSkipped: number;
};

export class ImportExportServiceError extends Error {
	statusCode: number;
	code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const toNumberOrEmpty = (value: Prisma.Decimal | number | null): string => {
	if (value === null) {
		return '';
	}
	return String(Number(value));
};

const knownFieldNames = [
	'date',
	'weightKg',
	'weight_kg',
	'caloriesConsumed',
	'calories_consumed',
	'proteinG',
	'protein_g',
	'carbsG',
	'carbs_g',
	'fatTotalG',
	'fat_total_g',
	'fatSaturatedG',
	'fat_saturated_g',
	'fatUnsaturatedG',
	'fat_unsaturated_g',
	'fatTransG',
	'fat_trans_g',
	'fiberG',
	'fiber_g',
	'sugarsG',
	'sugars_g',
	'sodiumMg',
	'sodium_mg',
	'calciumMg',
	'calcium_mg',
	'magnesiumMg',
	'magnesium_mg',
	'ironMg',
	'iron_mg',
	'zincMg',
	'zinc_mg',
	'waterLitres',
	'water_litres',
	'dayType',
	'day_type',
	'notes'
];

const fieldAliasToAppField: Record<string, keyof Omit<z.infer<typeof dailyLogCreateSchema>, 'date'> | 'date'> = {
	date: 'date',
	weightkg: 'weightKg',
	weight_kg: 'weightKg',
	caloriesconsumed: 'caloriesConsumed',
	calories_consumed: 'caloriesConsumed',
	proteing: 'proteinG',
	protein_g: 'proteinG',
	carbsg: 'carbsG',
	carbs_g: 'carbsG',
	fattotalg: 'fatTotalG',
	fat_total_g: 'fatTotalG',
	fatsaturatedg: 'fatSaturatedG',
	fat_saturated_g: 'fatSaturatedG',
	fatunsaturatedg: 'fatUnsaturatedG',
	fat_unsaturated_g: 'fatUnsaturatedG',
	fattransg: 'fatTransG',
	fat_trans_g: 'fatTransG',
	fiberg: 'fiberG',
	fiber_g: 'fiberG',
	dietary_fiber: 'fiberG',
	fiber: 'fiberG',
	sugarsg: 'sugarsG',
	sugars_g: 'sugarsG',
	sugar_g: 'sugarsG',
	sugars: 'sugarsG',
	sodiummg: 'sodiumMg',
	sodium_mg: 'sodiumMg',
	sodium: 'sodiumMg',
	calciummg: 'calciumMg',
	calcium_mg: 'calciumMg',
	calcium: 'calciumMg',
	magnesiummg: 'magnesiumMg',
	magnesium_mg: 'magnesiumMg',
	ironmg: 'ironMg',
	iron_mg: 'ironMg',
	zincmg: 'zincMg',
	zinc_mg: 'zincMg',
	waterlitres: 'waterLitres',
	water_litres: 'waterLitres',
	daytype: 'dayType',
	day_type: 'dayType',
	notes: 'notes'
};

const normalizeKey = (key: string): string => key.trim().toLowerCase();

const parseCsvRowsFromText = (csvText: string): ParsedCsvRow[] => {
	try {
		const parsed = parse(csvText, {
			columns: true,
			skip_empty_lines: true,
			trim: true,
			relax_column_count: true
		}) as unknown;

		if (!Array.isArray(parsed)) {
			throw new Error('Parsed CSV is not an array');
		}

		return parsed as ParsedCsvRow[];
	} catch {
		throw new ImportExportServiceError(
			'This file could not be read. Please make sure it is a valid CSV file.',
			400,
			'INVALID_FILE'
		);
	}
};

const parseCsvRowsFromBuffer = (csvBuffer: Buffer): ParsedCsvRow[] => {
	return parseCsvRowsFromText(csvBuffer.toString('utf-8'));
};

const parseCsvRecords = async (csvText: string): Promise<ParsedCsvRow[]> => {
	const records = parse(csvText, {
		columns: true,
		skip_empty_lines: true,
		trim: true
	}) as unknown;

	if (!Array.isArray(records)) {
		throw new ImportExportServiceError('Invalid CSV data', 400, 'INVALID_CSV');
	}

	return records as ParsedCsvRow[];
};

const decodeCsvInput = (input: ConfirmInput): string => {
	if (input.csvData && input.csvData.length > 0) {
		return input.csvData;
	}

	if (input.csvBase64 && input.csvBase64.length > 0) {
		return Buffer.from(input.csvBase64, 'base64').toString('utf-8');
	}

	throw new ImportExportServiceError('csvData or csvBase64 is required', 400, 'VALIDATION_ERROR');
};

const toParsedValue = (field: string, value: string): unknown => {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}

	const numericFields = new Set([
		'weightKg',
		'caloriesConsumed',
		'proteinG',
		'carbsG',
		'fatTotalG',
		'fatSaturatedG',
		'fatUnsaturatedG',
		'fatTransG',
		'fiberG',
		'sugarsG',
		'sodiumMg',
		'calciumMg',
		'magnesiumMg',
		'ironMg',
		'zincMg',
		'waterLitres'
	]);

	if (numericFields.has(field)) {
		const numberValue = Number(trimmed);
		return Number.isNaN(numberValue) ? trimmed : numberValue;
	}

	return trimmed;
};

const mapCsvRowToDailyLogInput = (
	row: ParsedCsvRow,
	columnMapping: Record<string, string>
): Record<string, unknown> => {
	const mapped: Record<string, unknown> = {};

	for (const [csvColumn, appFieldRaw] of Object.entries(columnMapping)) {
		const value = row[csvColumn] ?? '';
		const normalizedAppField = normalizeKey(appFieldRaw).replace(/[^a-z0-9_]/g, '');
		const appField = fieldAliasToAppField[normalizedAppField];

		if (!appField) {
			continue;
		}

		mapped[appField] = toParsedValue(appField, value);
	}

	return mapped;
};

const toCsvBuffer = (
	data: Array<Record<string, string>>,
	columns: string[]
): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		stringify(data, { header: true, columns }, (err, output) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(Buffer.from(output));
		});
	});
};

const trimToOptional = (value: string | undefined): string | null => {
	if (!value) {
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const toHabitCreateDataFromImport = (
	userId: string,
	row: z.infer<typeof habitImportRowSchema>,
	overrides?: Partial<Prisma.HabitUncheckedCreateInput>
): Prisma.HabitUncheckedCreateInput => {
	return {
		userId,
		name: row.name,
		habitType: row.habit_type,
		unitLabel: trimToOptional(row.unit_label),
		frequencyType: row.frequency_type,
		frequencyX: row.frequency_x ?? null,
		frequencyY: row.frequency_y ?? null,
		targetValue: row.target_value ?? null,
		targetDirection: row.target_direction ?? null,
		isCalorieBurning: row.is_calorie_burning,
		calorieUnit: row.calorie_unit ?? null,
		calorieKcal: row.calorie_kcal ?? null,
		scheduledDays: trimToOptional(row.scheduled_days),
		scheduledDates: trimToOptional(row.scheduled_dates),
		isActive: row.is_active,
		displayOrder: row.display_order ?? 0,
		...overrides
	};
};

const decodeBase64Csv = (encoded?: string): string | null => {
	if (!encoded || encoded.trim().length === 0) {
		return null;
	}

	return Buffer.from(encoded, 'base64').toString('utf-8');
};

const createZipBuffer = async (
	dailyLogsCsv: Buffer,
	habitLogsCsv: Buffer,
	habitDefinitionsCsv: Buffer
): Promise<Buffer> => {
	const output = new PassThrough();
	const archive = archiver('zip', { zlib: { level: 9 } });
	const chunks: Buffer[] = [];

	output.on('data', (chunk: Buffer) => {
		chunks.push(chunk);
	});

	const completion = new Promise<Buffer>((resolve, reject) => {
		output.on('finish', () => resolve(Buffer.concat(chunks)));
		output.on('error', reject);
		archive.on('error', reject);
	});

	archive.pipe(output);
	archive.append(dailyLogsCsv, { name: 'daily_logs.csv' });
	archive.append(habitLogsCsv, { name: 'habit_logs.csv' });
	archive.append(habitDefinitionsCsv, { name: 'habit_definitions.csv' });
	await archive.finalize();

	return completion;
};

export const exportUserData = async (userId: string): Promise<Buffer> => {
	const [dailyLogs, habitLogs, habits] = await Promise.all([
		prisma.dailyLog.findMany({
			where: { userId },
			orderBy: { date: 'asc' }
		}),
		prisma.habitLog.findMany({
			where: { userId },
			include: {
				habit: {
					select: { name: true }
				}
			},
			orderBy: { logDate: 'asc' }
		}),
		prisma.habit.findMany({
			where: { userId },
			orderBy: { displayOrder: 'asc' }
		})
	]);

	const dailyLogColumns = [
		'date',
		'weight_kg',
		'calories_consumed',
		'protein_g',
		'carbs_g',
		'fat_total_g',
		'fat_saturated_g',
		'fat_unsaturated_g',
		'fat_trans_g',
		'fiber_g',
		'sugars_g',
		'sodium_mg',
		'calcium_mg',
		'magnesium_mg',
		'iron_mg',
		'zinc_mg',
		'water_litres',
		'day_type',
		'notes'
	] as const;

	const dailyLogRows = dailyLogs.map((log) => ({
		date: dateOnly(log.date),
		weight_kg: toNumberOrEmpty(log.weightKg),
		calories_consumed: toNumberOrEmpty(log.caloriesConsumed),
		protein_g: toNumberOrEmpty(log.proteinG),
		carbs_g: toNumberOrEmpty(log.carbsG),
		fat_total_g: toNumberOrEmpty(log.fatTotalG),
		fat_saturated_g: toNumberOrEmpty(log.fatSaturatedG),
		fat_unsaturated_g: toNumberOrEmpty(log.fatUnsaturatedG),
		fat_trans_g: toNumberOrEmpty(log.fatTransG),
		fiber_g: toNumberOrEmpty(log.fiberG),
		sugars_g: toNumberOrEmpty(log.sugarsG),
		sodium_mg: toNumberOrEmpty(log.sodiumMg),
		calcium_mg: toNumberOrEmpty(log.calciumMg),
		magnesium_mg: toNumberOrEmpty(log.magnesiumMg),
		iron_mg: toNumberOrEmpty(log.ironMg),
		zinc_mg: toNumberOrEmpty(log.zincMg),
		water_litres: toNumberOrEmpty(log.waterLitres),
		day_type: log.dayType ?? '',
		notes: log.notes ?? ''
	}));

	const habitLogColumns = ['date', 'habit_name', 'value', 'calories_burned', 'notes'] as const;
	const habitLogRows = habitLogs.map((log) => ({
		date: dateOnly(log.logDate),
		habit_name: log.habit.name,
		value: toNumberOrEmpty(log.value),
		calories_burned: toNumberOrEmpty(log.caloriesBurned),
		notes: log.notes ?? ''
	}));

	const habitDefinitionColumns = [
		'name',
		'habit_type',
		'unit_label',
		'frequency_type',
		'frequency_x',
		'frequency_y',
		'target_value',
		'target_direction',
		'is_calorie_burning',
		'calorie_unit',
		'calorie_kcal',
		'scheduled_days',
		'scheduled_dates',
		'is_active',
		'display_order'
	] as const;
	const habitDefinitionRows = habits.map((habit) => ({
		name: habit.name,
		habit_type: habit.habitType,
		unit_label: habit.unitLabel ?? '',
		frequency_type: habit.frequencyType,
		frequency_x: toNumberOrEmpty(habit.frequencyX),
		frequency_y: toNumberOrEmpty(habit.frequencyY),
		target_value: toNumberOrEmpty(habit.targetValue),
		target_direction: habit.targetDirection ?? '',
		is_calorie_burning: habit.isCalorieBurning ? 'true' : 'false',
		calorie_unit: toNumberOrEmpty(habit.calorieUnit),
		calorie_kcal: toNumberOrEmpty(habit.calorieKcal),
		scheduled_days: habit.scheduledDays ?? '',
		scheduled_dates: habit.scheduledDates ?? '',
		is_active: habit.isActive ? 'true' : 'false',
		display_order: String(habit.displayOrder)
	}));

	const [dailyLogsCsv, habitLogsCsv, habitDefinitionsCsv] = await Promise.all([
		toCsvBuffer(dailyLogRows, [...dailyLogColumns]),
		toCsvBuffer(habitLogRows, [...habitLogColumns]),
		toCsvBuffer(habitDefinitionRows, [...habitDefinitionColumns])
	]);

	return createZipBuffer(dailyLogsCsv, habitLogsCsv, habitDefinitionsCsv);
};

export const previewCsvImport = async (csvBuffer: Buffer): Promise<PreviewResult> => {
	let rows: ParsedCsvRow[];

	try {
		rows = parseCsvRowsFromBuffer(csvBuffer);
	} catch {
		throw new ImportExportServiceError(
			'This file could not be read. Please make sure it is a valid CSV file.',
			400,
			'INVALID_FILE'
		);
	}

	const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
	const suggestedFieldMappings = new Map<string, string>([
		['fiber_g', 'fiberG'],
		['fiber', 'fiberG'],
		['dietary_fiber', 'fiberG'],
		['sugars_g', 'sugarsG'],
		['sugars', 'sugarsG'],
		['sugar_g', 'sugarsG'],
		['sodium_mg', 'sodiumMg'],
		['sodium', 'sodiumMg'],
		['calcium_mg', 'calciumMg'],
		['calcium', 'calciumMg']
	]);

	const lowerFieldNameMap = new Map<string, string>();
	for (const fieldName of knownFieldNames) {
		lowerFieldNameMap.set(normalizeKey(fieldName), fieldName);
	}

	const suggestedMappings: Record<string, string | null> = {};
	for (const column of detectedColumns) {
		const normalizedColumn = normalizeKey(column);
		suggestedMappings[column] =
			suggestedFieldMappings.get(normalizedColumn) ?? lowerFieldNameMap.get(normalizedColumn) ?? null;
	}

	const requiredColumns = new Set([
		'date',
		'weight_kg',
		'calories_consumed',
		'protein_g',
		'carbs_g',
		'water_litres',
		'day_type'
	]);

	const matchedRequiredColumns = new Set<string>();
	for (const column of detectedColumns) {
		const normalizedColumn = normalizeKey(column);
		if (requiredColumns.has(normalizedColumn)) {
			matchedRequiredColumns.add(normalizedColumn);
		}
	}

	const formatValid = matchedRequiredColumns.size >= 3;

	return {
		detectedColumns,
		previewRows: rows.slice(0, 5),
		suggestedMappings,
		formatValid
	};
};

export const previewHabitDefinitions = async (
	userId: string,
	csvBuffer: Buffer
): Promise<HabitDefinitionsPreviewResult> => {
	let rows: ParsedCsvRow[];
	try {
		rows = parseCsvRowsFromBuffer(csvBuffer);
	} catch {
		throw new ImportExportServiceError(
			'This file could not be read. Please make sure it is a valid CSV file.',
			400,
			'INVALID_FILE'
		);
	}

	const errors: { row: number; message: string }[] = [];
	const conflicts: HabitDefinitionPreviewConflict[] = [];
	const newHabits: string[] = [];
	let validRows = 0;

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];
		const rowNumber = index + 2;
		const parsedRow = habitImportRowSchema.safeParse(row);

		if (!parsedRow.success) {
			errors.push({
				row: rowNumber,
				message: parsedRow.error.errors.map((issue) => issue.message).join('; ')
			});
			continue;
		}

		validRows += 1;
		const existingHabit = await prisma.habit.findFirst({
			where: { userId, name: parsedRow.data.name }
		});

		if (existingHabit) {
			conflicts.push({
				habitName: parsedRow.data.name,
				existingHabitId: existingHabit.id,
				existingHabit: {
					name: existingHabit.name,
					habitType: existingHabit.habitType,
					frequencyType: existingHabit.frequencyType,
					targetValue: existingHabit.targetValue == null ? null : Number(existingHabit.targetValue),
					isCalorieBurning: existingHabit.isCalorieBurning
				},
				incomingHabit: {
					name: parsedRow.data.name,
					habitType: parsedRow.data.habit_type,
					frequencyType: parsedRow.data.frequency_type,
					targetValue: parsedRow.data.target_value,
					isCalorieBurning: parsedRow.data.is_calorie_burning
				}
			});
		} else {
			newHabits.push(parsedRow.data.name);
		}
	}

	return {
		totalRows: rows.length,
		validRows,
		errors,
		conflicts,
		newHabits
	};
};

export const previewHabitLogs = async (
	userId: string,
	csvBuffer: Buffer
): Promise<HabitLogsPreviewResult> => {
	let rows: ParsedCsvRow[];
	try {
		rows = parseCsvRowsFromBuffer(csvBuffer);
	} catch {
		throw new ImportExportServiceError(
			'This file could not be read. Please make sure it is a valid CSV file.',
			400,
			'INVALID_FILE'
		);
	}

	const errors: { row: number; message: string }[] = [];
	let validRows = 0;
	const validHabitNames = new Set<string>();

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];
		const parsedRow = habitLogImportRowSchema.safeParse(row);

		if (!parsedRow.success) {
			errors.push({
				row: index + 2,
				message: parsedRow.error.errors.map((issue) => issue.message).join('; ')
			});
			continue;
		}

		validRows += 1;
		validHabitNames.add(parsedRow.data.habit_name);
	}

	const unresolvedHabits: string[] = [];
	const resolvedHabits: string[] = [];

	for (const habitName of Array.from(validHabitNames)) {
		const existingHabit = await prisma.habit.findFirst({
			where: { userId, name: habitName },
			select: { id: true }
		});

		if (existingHabit) {
			resolvedHabits.push(habitName);
		} else {
			unresolvedHabits.push(habitName);
		}
	}

	return {
		totalRows: rows.length,
		validRows,
		errors,
		unresolvedHabits,
		resolvedHabits
	};
};

export const confirmHabitImport = async (
	userId: string,
	data: HabitImportConfirmInput
): Promise<HabitImportConfirmResult> => {
	const definitionsCsv = decodeBase64Csv(data.definitionsData);
	const logsCsv = decodeBase64Csv(data.logsData);

	if (!definitionsCsv && !logsCsv) {
		throw new ImportExportServiceError(
			'definitionsData or logsData is required',
			400,
			'VALIDATION_ERROR'
		);
	}

	const conflictResolutionMap = new Map<string, HabitConflictResolution>(
		(data.conflictResolutions ?? []).map((item) => [item.habitName, item.resolution])
	);

	return prisma.$transaction(
		async (tx) => {
			let habitsCreated = 0;
			let habitsUpdated = 0;
			let habitsLinked = 0;
			let logsImported = 0;
			let logsSkipped = 0;

			const habitNameToId = new Map<string, string>();
			const habitCache = new Map<string, { isCalorieBurning: boolean; calorieUnit: number | null; calorieKcal: number | null }>();

			if (definitionsCsv) {
				const definitionRows = parseCsvRowsFromText(definitionsCsv);

				for (const row of definitionRows) {
					const parsedRow = habitImportRowSchema.safeParse(row);
					if (!parsedRow.success) {
						continue;
					}

					const incoming = parsedRow.data;
					const existingHabit = await tx.habit.findFirst({ where: { userId, name: incoming.name } });

					if (existingHabit) {
						const resolution = conflictResolutionMap.get(incoming.name) ?? 'link';

						if (resolution === 'link') {
							habitsLinked += 1;
							habitNameToId.set(incoming.name, existingHabit.id);
							habitCache.set(existingHabit.id, {
								isCalorieBurning: existingHabit.isCalorieBurning,
								calorieUnit: existingHabit.calorieUnit == null ? null : Number(existingHabit.calorieUnit),
								calorieKcal: existingHabit.calorieKcal == null ? null : Number(existingHabit.calorieKcal)
							});
							continue;
						}

						if (resolution === 'create_new') {
							let nextName = `${incoming.name} (imported)`;
							let nameCounter = 2;
							while (await tx.habit.findFirst({ where: { userId, name: nextName }, select: { id: true } })) {
								nextName = `${incoming.name} (imported ${nameCounter})`;
								nameCounter += 1;
							}

							const createdHabit = await tx.habit.create({
								data: toHabitCreateDataFromImport(userId, incoming, { name: nextName })
							});
							habitsCreated += 1;
							habitNameToId.set(incoming.name, createdHabit.id);
							habitCache.set(createdHabit.id, {
								isCalorieBurning: createdHabit.isCalorieBurning,
								calorieUnit: createdHabit.calorieUnit == null ? null : Number(createdHabit.calorieUnit),
								calorieKcal: createdHabit.calorieKcal == null ? null : Number(createdHabit.calorieKcal)
							});
							continue;
						}

						const conservativeUpdate: Prisma.HabitUpdateInput = {
							habitType: incoming.habit_type,
							unitLabel: trimToOptional(incoming.unit_label),
							frequencyType: incoming.frequency_type,
							frequencyX: incoming.frequency_x ?? null,
							frequencyY: incoming.frequency_y ?? null,
							scheduledDays: trimToOptional(incoming.scheduled_days),
							scheduledDates: trimToOptional(incoming.scheduled_dates)
						};

						if (existingHabit.targetValue == null && incoming.target_value !== undefined) {
							conservativeUpdate.targetValue = incoming.target_value;
						}
						if (existingHabit.targetDirection == null && incoming.target_direction !== undefined) {
							conservativeUpdate.targetDirection = incoming.target_direction;
						}
						if ((existingHabit as { isCalorieBurning?: boolean | null }).isCalorieBurning == null) {
							conservativeUpdate.isCalorieBurning = incoming.is_calorie_burning;
						}
						if (existingHabit.calorieUnit == null && incoming.calorie_unit !== undefined) {
							conservativeUpdate.calorieUnit = incoming.calorie_unit;
						}
						if (existingHabit.calorieKcal == null && incoming.calorie_kcal !== undefined) {
							conservativeUpdate.calorieKcal = incoming.calorie_kcal;
						}

						const updatedHabit = await tx.habit.update({
							where: { id: existingHabit.id },
							data: conservativeUpdate
						});

						habitsUpdated += 1;
						habitNameToId.set(incoming.name, updatedHabit.id);
						habitCache.set(updatedHabit.id, {
							isCalorieBurning: updatedHabit.isCalorieBurning,
							calorieUnit: updatedHabit.calorieUnit == null ? null : Number(updatedHabit.calorieUnit),
							calorieKcal: updatedHabit.calorieKcal == null ? null : Number(updatedHabit.calorieKcal)
						});
						continue;
					}

					const createdHabit = await tx.habit.create({
						data: toHabitCreateDataFromImport(userId, incoming)
					});
					habitsCreated += 1;
					habitNameToId.set(incoming.name, createdHabit.id);
					habitCache.set(createdHabit.id, {
						isCalorieBurning: createdHabit.isCalorieBurning,
						calorieUnit: createdHabit.calorieUnit == null ? null : Number(createdHabit.calorieUnit),
						calorieKcal: createdHabit.calorieKcal == null ? null : Number(createdHabit.calorieKcal)
					});
				}
			}

			if (logsCsv) {
				const logRows = parseCsvRowsFromText(logsCsv);

				for (const row of logRows) {
					const parsedRow = habitLogImportRowSchema.safeParse(row);
					if (!parsedRow.success) {
						logsSkipped += 1;
						continue;
					}

					const logData = parsedRow.data;
					let habitId = habitNameToId.get(logData.habit_name);
					let habitMeta =
						habitId && habitCache.has(habitId)
							? habitCache.get(habitId) ?? null
							: null;

					if (!habitId) {
						const existingHabit = await tx.habit.findFirst({
							where: { userId, name: logData.habit_name },
							select: {
								id: true,
								isCalorieBurning: true,
								calorieUnit: true,
								calorieKcal: true
							}
						});

						if (!existingHabit) {
							logsSkipped += 1;
							continue;
						}

						habitId = existingHabit.id;
						habitNameToId.set(logData.habit_name, existingHabit.id);
						habitMeta = {
							isCalorieBurning: existingHabit.isCalorieBurning,
							calorieUnit: existingHabit.calorieUnit == null ? null : Number(existingHabit.calorieUnit),
							calorieKcal: existingHabit.calorieKcal == null ? null : Number(existingHabit.calorieKcal)
						};
						habitCache.set(existingHabit.id, habitMeta);
					}

					const calculatedCaloriesBurned =
						logData.calories_burned !== undefined
							? logData.calories_burned
							: habitMeta &&
								habitMeta.isCalorieBurning &&
								habitMeta.calorieUnit &&
								habitMeta.calorieKcal
								? (logData.value / habitMeta.calorieUnit) * habitMeta.calorieKcal
								: null;

					await tx.habitLog.upsert({
						where: {
							userId_habitId_logDate: {
								userId,
								habitId,
								logDate: new Date(`${logData.date}T00:00:00.000Z`)
							}
						},
						create: {
							userId,
							habitId,
							logDate: new Date(`${logData.date}T00:00:00.000Z`),
							value: logData.value,
							caloriesBurned: calculatedCaloriesBurned,
							notes: logData.notes ?? null
						},
						update: {
							value: logData.value,
							caloriesBurned: calculatedCaloriesBurned,
							notes: logData.notes ?? null
						}
					});

					logsImported += 1;
				}
			}

			return {
				habitsCreated,
				habitsUpdated,
				habitsLinked,
				logsImported,
				logsSkipped
			};
		},
		{ maxWait: 10000, timeout: 30000 }
	);
};

export const confirmCsvImport = async (userId: string, input: ConfirmInput): Promise<ConfirmResult> => {
	const csvText = decodeCsvInput(input);
	const records = await parseCsvRecords(csvText);

	const rowErrors: { row: number; errors: string[] }[] = [];
	const validRows: Array<{ row: number; data: z.infer<typeof dailyLogCreateSchema> }> = [];

	records.forEach((row, index) => {
		const mapped = mapCsvRowToDailyLogInput(row, input.columnMapping);
		const parsed = dailyLogCreateSchema.safeParse(mapped);
		const rowNumber = index + 2;

		if (!parsed.success) {
			rowErrors.push({
				row: rowNumber,
				errors: parsed.error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			});
			return;
		}

		validRows.push({ row: rowNumber, data: parsed.data });
	});

	if (rowErrors.length > 0) {
		throw new ImportExportServiceError(JSON.stringify(rowErrors), 422, 'ROW_VALIDATION_ERROR');
	}

	const uniqueDates = Array.from(new Set(validRows.map((row) => row.data.date)));
	const existingLogs = await prisma.dailyLog.findMany({
		where: {
			userId,
			date: {
				in: uniqueDates.map((date) => new Date(`${date}T00:00:00.000Z`))
			}
		},
		select: { date: true }
	});

	const resolution = input.conflictResolution ?? 'skip';
	const existingDates = new Set(existingLogs.map((log) => dateOnly(log.date)));
	const conflicts: ConflictRow[] = validRows
		.filter((row) => existingDates.has(row.data.date))
		.map((row) => ({ row: row.row, date: row.data.date, action: resolution }));
	const rowsToInsert: Array<{ date: string; data: Omit<z.infer<typeof dailyLogCreateSchema>, 'date'> }> = [];
	const rowsToUpdate: Array<{ date: string; data: Omit<z.infer<typeof dailyLogCreateSchema>, 'date'> }> = [];
	let skipped = 0;

	for (const row of validRows) {
		const isConflict = existingDates.has(row.data.date);
		const { date, ...rest } = row.data;

		if (isConflict && resolution === 'skip') {
			skipped += 1;
			continue;
		}

		if (isConflict && resolution === 'overwrite') {
			rowsToUpdate.push({ date, data: rest });
			continue;
		}

		rowsToInsert.push({ date, data: rest });
	}

	const imported = rowsToInsert.length + rowsToUpdate.length;

	await prisma.$transaction(
		async (tx) => {
			for (const row of rowsToInsert) {
				await tx.dailyLog.create({
					data: {
						userId,
						date: new Date(`${row.date}T00:00:00.000Z`),
						...row.data
					}
				});
			}

			for (const row of rowsToUpdate) {
				await tx.dailyLog.update({
					where: {
						userId_date: {
							userId,
							date: new Date(`${row.date}T00:00:00.000Z`)
						}
					},
					data: {
						...row.data
					}
				});
			}
		},
		{
			maxWait: 10000,
			timeout: 30000
		}
	);

	return {
		imported,
		skipped,
		conflicts
	};
};

export const parseRowValidationError = (
	error: ImportExportServiceError
): { row: number; errors: string[] }[] | null => {
	if (error.code !== 'ROW_VALIDATION_ERROR') {
		return null;
	}

	try {
		const parsed = JSON.parse(error.message) as unknown;
		if (!Array.isArray(parsed)) {
			return null;
		}

		return parsed as { row: number; errors: string[] }[];
	} catch {
		return null;
	}
};
