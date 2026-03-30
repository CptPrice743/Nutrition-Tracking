import archiver from 'archiver';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import type { Prisma } from '@prisma/client';
import { PassThrough } from 'stream';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { dailyLogCreateSchema } from '../schemas/logs';

type ParsedCsvRow = Record<string, string>;

type PreviewResult = {
	detectedColumns: string[];
	previewRows: ParsedCsvRow[];
	suggestedMappings: Record<string, string | null>;
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

const createZipBuffer = async (
	dailyLogsCsv: string,
	habitLogsCsv: string
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
	await archive.finalize();

	return completion;
};

export const exportUserData = async (userId: string): Promise<Buffer> => {
	const [dailyLogs, habitLogs] = await Promise.all([
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
		})
	]);

	const dailyLogRows = dailyLogs.map((log) => [
		dateOnly(log.date),
		toNumberOrEmpty(log.weightKg),
		log.caloriesConsumed ?? '',
		log.proteinG ?? '',
		log.carbsG ?? '',
		log.fatTotalG ?? '',
		log.fatSaturatedG ?? '',
		log.fatUnsaturatedG ?? '',
		toNumberOrEmpty(log.fatTransG),
		log.magnesiumMg ?? '',
		toNumberOrEmpty(log.ironMg),
		toNumberOrEmpty(log.zincMg),
		toNumberOrEmpty(log.waterLitres),
		log.dayType ?? '',
		log.notes ?? ''
	]);

	const habitLogRows = habitLogs.map((log) => [
		dateOnly(log.logDate),
		log.habit.name,
		toNumberOrEmpty(log.value),
		toNumberOrEmpty(log.caloriesBurned),
		log.notes ?? ''
	]);

	const dailyLogsCsv = stringify(dailyLogRows, {
		header: true,
		columns: [
			'date',
			'weight_kg',
			'calories_consumed',
			'protein_g',
			'carbs_g',
			'fat_total_g',
			'fat_saturated_g',
			'fat_unsaturated_g',
			'fat_trans_g',
			'magnesium_mg',
			'iron_mg',
			'zinc_mg',
			'water_litres',
			'day_type',
			'notes'
		]
	});

	const habitLogsCsv = stringify(habitLogRows, {
		header: true,
		columns: ['date', 'habit_name', 'value', 'calories_burned', 'notes']
	});

	return createZipBuffer(dailyLogsCsv, habitLogsCsv);
};

export const previewCsvImport = async (csvBuffer: Buffer): Promise<PreviewResult> => {
	const csvText = csvBuffer.toString('utf-8');
	const rows = await parseCsvRecords(csvText);

	const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

	const lowerFieldNameMap = new Map<string, string>();
	for (const fieldName of knownFieldNames) {
		lowerFieldNameMap.set(normalizeKey(fieldName), fieldName);
	}

	const suggestedMappings: Record<string, string | null> = {};
	for (const column of detectedColumns) {
		const normalizedColumn = normalizeKey(column);
		suggestedMappings[column] = lowerFieldNameMap.get(normalizedColumn) ?? null;
	}

	return {
		detectedColumns,
		previewRows: rows.slice(0, 5),
		suggestedMappings
	};
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
