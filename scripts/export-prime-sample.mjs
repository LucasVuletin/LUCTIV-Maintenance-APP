import ExcelJS from 'exceljs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(await readFile(join(root, 'src', 'app', 'prime', 'generated', 'prime.generated.json'), 'utf8'));
const output = join(root, 'artifacts', 'LUCTIV_LAJE_SET5_W106_S51_sample.xlsx');
const summaryHeaders = ['CaseId', 'PumpId', 'FailureDetectedAt', 'FailureEvidence', 'FailureReason', 'ConfirmedFailureReason', 'DiagnosisStatus', 'ResponsibleGroup', 'PartOfPlan', 'STTOrder', 'STTReadiness', 'PlannedAction', 'ActualAction', 'MinutesToRecovery', 'ActualMinutes', 'ReplacementPumpId', 'ResolutionOutcome', 'WorkStatus', 'ReturnToServiceAt', 'Comments'];
const dateFields = new Set(['CaptureTimestamp', 'FailureDetectedAt', 'WorkStartAt', 'WorkEndAt', 'ReturnToServiceAt']);
const value = (field, entry) => dateFields.has(field) && entry ? new Date(entry) : entry;
const rows = contract.exampleRows;
const cases = rows.filter((row) => row.CaseId && row.FailureReason);
const workbook = new ExcelJS.Workbook();
workbook.creator = 'LUCTIV: Maintenance APP';
const summary = workbook.addWorksheet('Stage_Failure_Summary', { views: [{ state: 'frozen', ySplit: 20 }] });
summary.addRow(['LUCTIV V1 PRIME — STAGE FAILURE SUMMARY']);
summary.mergeCells(1, 1, 1, 4);
const first = rows[0];
const metadata = [
  ['PRIME schema version', contract.schemaVersion], ['Pad', first.Pad], ['Set', first.SetId], ['Spread', first.SpreadIdentifier],
  ['Crew', first.CrewName], ['Well', first.Well], ['Stage', first.Stage], ['StageExecutionId', first.StageExecutionId],
  ['Export timestamp', new Date()], ['Exported by', first.CapturedBy], ['Total pumps', rows.length],
  ['Available pumps', rows.filter((row) => ['Rigged In - Working', 'Rigged Out - Working', 'Ready'].includes(row.CurrentStatus)).length],
  ['Broken pumps', rows.filter((row) => row.ConditionClass === 'Broken').length],
  ['Near-limit pumps', rows.filter((row) => row.ConditionClass === 'Almost / Consumable').length],
  ['Open cases', cases.length], ['Selected STT cases', cases.filter((row) => row.PartOfPlan === 'Yes').length], ['Closed cases', 0],
];
metadata.forEach((entry) => summary.addRow(entry));
summary.addRow([]);
const summaryHeaderRow = summary.rowCount + 1;
summary.addRow(summaryHeaders);
for (const row of cases) summary.addRow(summaryHeaders.map((header) => value(header, row[header] ?? '')));
summary.autoFilter = { from: { row: summaryHeaderRow, column: 1 }, to: { row: summary.rowCount, column: summaryHeaders.length } };
summary.getRow(summaryHeaderRow).font = { bold: true, color: { argb: 'FFFFFFFF' } };
summary.getRow(summaryHeaderRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A171C' } };
summary.columns.forEach((column) => { column.width = 20; });
summary.getColumn(2).numFmt = '@';

const log = workbook.addWorksheet('Pump_Stage_Log', { views: [{ state: 'frozen', ySplit: 1 }] });
log.addRow(contract.headers);
for (const row of rows) log.addRow(contract.headers.map((header) => value(header, row[header] ?? '')));
log.autoFilter = { from: { row: 1, column: 1 }, to: { row: log.rowCount, column: contract.headers.length } };
log.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
log.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A171C' } };
log.columns.forEach((column) => { column.width = 20; });
log.getColumn(contract.headers.indexOf('PumpId') + 1).numFmt = '@';
log.getColumn(contract.headers.indexOf('ReplacementPumpId') + 1).numFmt = '@';
for (const field of dateFields) log.getColumn(contract.headers.indexOf(field) + 1).numFmt = 'yyyy-mm-dd hh:mm';
await mkdir(dirname(output), { recursive: true });
await workbook.xlsx.writeFile(output);

const verification = new ExcelJS.Workbook();
await verification.xlsx.readFile(output);
const verifiedLog = verification.getWorksheet('Pump_Stage_Log');
const verifiedHeaders = verifiedLog.getRow(1).values.slice(1);
if (verification.worksheets.map((sheet) => sheet.name).join('|') !== 'Stage_Failure_Summary|Pump_Stage_Log') throw new Error('Unexpected sample sheet structure');
if (verifiedHeaders.length !== 52 || verifiedHeaders.join('|') !== contract.headers.join('|')) throw new Error('Sample PRIME headers do not match');
if (verifiedLog.rowCount !== 9) throw new Error(`Expected 8 example pumps, found ${verifiedLog.rowCount - 1}`);
console.log(`Sample verified: ${output}`);
console.log(`Sheets: ${verification.worksheets.map((sheet) => sheet.name).join(', ')}; headers: ${verifiedHeaders.length}; pumps: ${verifiedLog.rowCount - 1}`);
