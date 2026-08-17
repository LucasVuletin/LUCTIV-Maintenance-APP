import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, 'LUCTIV_V1_PRIME.xlsx');
const outputPath = join(root, 'src', 'app', 'prime', 'generated', 'prime.generated.ts');
const jsonOutputPath = join(root, 'src', 'app', 'prime', 'generated', 'prime.generated.json');
const expectedHeaders = [
  'RecordId', 'CaptureId', 'StageExecutionId', 'CaptureTimestamp', 'CapturedBy', 'CaseId', 'Pad', 'SetId',
  'SpreadIdentifier', 'CrewName', 'Well', 'Stage', 'PumpId', 'PumpType', 'Manifold', 'ManifoldType', 'Position',
  'PumpDistance', 'ActuatorNumber', 'DGB_Bifuel', 'CurrentStatus', 'ConditionClass', 'DetectionSource',
  'FailureDetectedAt', 'FailureArea', 'FailureReason', 'FailureEvidence', 'DiagnosisStatus', 'ResponsibleGroup',
  'PartOfPlan', 'STTOrder', 'STTReadiness', 'PlannedAction', 'ReplacementPumpId', 'MinutesToRecovery',
  'TaskDescription', 'DeferredReason', 'WorkStatus', 'WorkStartAt', 'WorkEndAt', 'ActualMinutes', 'ActualAction',
  'ConfirmedFailureReason', 'ResolutionOutcome', 'ReturnToServiceAt', 'Comments', 'PumpRate', 'PumpPressure',
  'CleanRate', 'DirtyRate', 'JobRate', 'OffsetWellPressure',
];

function fail(message) {
  throw new Error(`PRIME contract invalid: ${message}`);
}

function text(cell) {
  return cell.text.trim();
}

function value(cell) {
  const raw = cell.value;
  if (raw === null || raw === undefined) return '';
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'object') return text(cell);
  return raw;
}

function findHeaderRow(sheet, firstHeader) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 20); rowNumber += 1) {
    if (text(sheet.getRow(rowNumber).getCell(1)) === firstHeader) return rowNumber;
  }
  fail(`${sheet.name} does not contain ${firstHeader}`);
}

function rowsAfter(sheet, headerRow, width) {
  const rows = [];
  for (let rowNumber = headerRow + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = Array.from({ length: width }, (_, index) => value(row.getCell(index + 1)));
    if (values.some((entry) => entry !== '')) rows.push(values);
  }
  return rows;
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(sourcePath);
for (const name of ['PRIME_README', 'Pump_Stage_Log', 'Failure_Action_Catalog', 'Catalogs', 'Data_Dictionary']) {
  if (!workbook.getWorksheet(name)) fail(`missing worksheet ${name}`);
}

const logSheet = workbook.getWorksheet('Pump_Stage_Log');
const logHeaderRow = findHeaderRow(logSheet, 'RecordId');
const headers = Array.from({ length: 52 }, (_, index) => text(logSheet.getRow(logHeaderRow).getCell(index + 1)));
if (headers.length !== 52 || headers.some((header) => !header)) fail('Pump_Stage_Log must contain exactly 52 nonblank headers');
if (headers.join('|') !== expectedHeaders.join('|')) fail('Pump_Stage_Log header names or order differ from PRIME 1.0');
const exampleRows = rowsAfter(logSheet, logHeaderRow, headers.length).map((row) =>
  Object.fromEntries(headers.map((header, index) => [header, row[index]])),
);
if (exampleRows.length !== 8) fail(`expected 8 example Pump_Stage_Log rows, found ${exampleRows.length}`);

const dictionarySheet = workbook.getWorksheet('Data_Dictionary');
const dictionaryHeaderRow = findHeaderRow(dictionarySheet, 'FieldName');
const dictionaryHeaders = Array.from({ length: 9 }, (_, index) => text(dictionarySheet.getRow(dictionaryHeaderRow).getCell(index + 1)));
const dataDictionary = rowsAfter(dictionarySheet, dictionaryHeaderRow, dictionaryHeaders.length).map((row) =>
  Object.fromEntries(dictionaryHeaders.map((header, index) => [header, row[index]])),
);
const dictionaryFields = dataDictionary.map((entry) => String(entry.FieldName));
if (dictionaryFields.join('|') !== headers.join('|')) {
  const mismatches = headers.flatMap((header, index) => dictionaryFields[index] === header ? [] : [`${index + 1}: ${header} != ${dictionaryFields[index] ?? '<missing>'}`]);
  fail(`Data_Dictionary fields do not exactly match Pump_Stage_Log headers (${mismatches.join(', ')})`);
}
for (const entry of dataDictionary.filter((item) => String(item.RequiredRule).startsWith('Required'))) {
  if (!headers.includes(String(entry.FieldName))) fail(`required field ${entry.FieldName} is omitted`);
}

const ruleSheet = workbook.getWorksheet('Failure_Action_Catalog');
const ruleHeaderRow = findHeaderRow(ruleSheet, 'RuleId');
const ruleHeaders = Array.from({ length: 11 }, (_, index) => text(ruleSheet.getRow(ruleHeaderRow).getCell(index + 1)));
const failureRules = rowsAfter(ruleSheet, ruleHeaderRow, ruleHeaders.length).map((row) =>
  Object.fromEntries(ruleHeaders.map((header, index) => [header, row[index]])),
);
const ruleIds = failureRules.map((rule) => String(rule.RuleId));
if (new Set(ruleIds).size !== ruleIds.length) fail('Failure_Action_Catalog RuleId values must be unique');

const catalogSheet = workbook.getWorksheet('Catalogs');
const catalogHeaderRow = findHeaderRow(catalogSheet, 'CurrentStatus');
const catalogHeaders = Array.from({ length: 14 }, (_, index) => text(catalogSheet.getRow(catalogHeaderRow).getCell(index + 1)));
const catalogs = Object.fromEntries(catalogHeaders.map((header, columnIndex) => {
  const entries = [];
  for (let rowNumber = catalogHeaderRow + 1; rowNumber <= catalogSheet.rowCount; rowNumber += 1) {
    const entry = text(catalogSheet.getRow(rowNumber).getCell(columnIndex + 1));
    if (entry) entries.push(entry);
  }
  if (!entries.length) fail(`catalog ${header} has no controlled values`);
  return [header, entries];
}));

for (const rule of failureRules) {
  const checks = [
    ['FailureReason', 'FailureReason'], ['FailureArea', 'FailureArea'], ['ConditionClass', 'ConditionClass'],
    ['ResponsibleGroup', 'ResponsibleGroup'], ['SuggestedAction', 'PlannedAction'],
  ];
  for (const [field, catalog] of checks) {
    if (!catalogs[catalog].includes(String(rule[field]))) fail(`${rule.RuleId} uses ${field} outside ${catalog}`);
  }
}

const readmeSheet = workbook.getWorksheet('PRIME_README');
const readme = [];
for (let rowNumber = 1; rowNumber <= readmeSheet.rowCount; rowNumber += 1) {
  const entries = Array.from({ length: readmeSheet.actualColumnCount }, (_, index) => text(readmeSheet.getRow(rowNumber).getCell(index + 1))).filter(Boolean);
  if (entries.length) readme.push(entries);
}

const source = `export const PRIME_SCHEMA_VERSION = '1.0' as const;\n\nexport const PRIME_HEADERS = ${JSON.stringify(headers, null, 2)} as const;\n\nexport const PRIME_DATA_DICTIONARY = ${JSON.stringify(dataDictionary, null, 2)} as const;\n\nexport const PRIME_CATALOGS = ${JSON.stringify(catalogs, null, 2)} as const;\n\nexport const PRIME_FAILURE_RULES = ${JSON.stringify(failureRules, null, 2)} as const;\n\nexport const PRIME_EXAMPLE_ROWS = ${JSON.stringify(exampleRows, null, 2)} as const;\n\nexport const PRIME_README = ${JSON.stringify(readme, null, 2)} as const;\n`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, 'utf8');
await writeFile(jsonOutputPath, JSON.stringify({ schemaVersion: '1.0', headers, dataDictionary, catalogs, failureRules, exampleRows, readme }, null, 2), 'utf8');
console.log(`PRIME 1.0 synchronized: ${headers.length} fields, ${failureRules.length} rules, ${exampleRows.length} example pumps.`);
