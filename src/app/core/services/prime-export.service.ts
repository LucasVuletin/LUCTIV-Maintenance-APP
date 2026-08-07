import { Injectable } from '@angular/core';
import type { Workbook, Worksheet } from 'exceljs';
import { PrimeMaintenanceState, PumpStageLogRow } from '../models/prime.models';
import { mapFailureSummary, stageMetadata, SUMMARY_HEADERS } from '../../prime/export-mapper';
import { PRIME_HEADERS } from '../../prime/schema';
import { PrimeExportServiceContract } from './maintenance-repository';

const DATE_FIELDS = new Set(['CaptureTimestamp', 'FailureDetectedAt', 'WorkStartAt', 'WorkEndAt', 'ReturnToServiceAt']);

function excelValue(field: string, value: string | number | null): string | number | Date | null {
  if (DATE_FIELDS.has(field) && typeof value === 'string' && value) return new Date(value);
  return value;
}

function styleHeader(sheet: Worksheet, rowNumber: number): void {
  const row = sheet.getRow(rowNumber);
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A171C' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
}

export function populatePrimeWorkbook(workbook: Workbook, state: PrimeMaintenanceState, exportedAt = new Date().toISOString()): Workbook {
  workbook.creator = 'LUCTIV: Maintenance APP';
  workbook.created = new Date(exportedAt);
  const summary = workbook.addWorksheet('Stage_Failure_Summary', { views: [{ state: 'frozen', ySplit: 20 }] });
  summary.addRow(['LUCTIV V1 PRIME — STAGE FAILURE SUMMARY']);
  summary.mergeCells(1, 1, 1, 4);
  summary.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A171C' } };
  for (const pair of stageMetadata(state, exportedAt)) summary.addRow(pair);
  summary.addRow([]);
  const summaryHeaderRow = summary.rowCount + 1;
  summary.addRow([...SUMMARY_HEADERS]);
  styleHeader(summary, summaryHeaderRow);
  for (const item of mapFailureSummary(state.failureCases)) {
    summary.addRow(SUMMARY_HEADERS.map((header) => excelValue(header, item[header])));
  }
  summary.autoFilter = { from: { row: summaryHeaderRow, column: 1 }, to: { row: Math.max(summaryHeaderRow, summary.rowCount), column: SUMMARY_HEADERS.length } };
  summary.columns.forEach((column, index) => { column.width = index === 3 || index === 4 || index === 19 ? 32 : 20; });
  summary.getColumn(2).numFmt = '@';
  for (const field of ['FailureDetectedAt', 'ReturnToServiceAt']) {
    summary.getColumn(SUMMARY_HEADERS.indexOf(field as (typeof SUMMARY_HEADERS)[number]) + 1).numFmt = 'yyyy-mm-dd hh:mm';
  }

  const log = workbook.addWorksheet('Pump_Stage_Log', { views: [{ state: 'frozen', ySplit: 1 }] });
  log.addRow([...PRIME_HEADERS]);
  styleHeader(log, 1);
  const rows = state.captures.filter((capture) => capture.stageExecutionId === state.stage.stageExecutionId).flatMap((capture) => capture.rows);
  for (const row of rows) log.addRow(PRIME_HEADERS.map((header) => excelValue(header, row[header as keyof PumpStageLogRow])));
  log.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, log.rowCount), column: PRIME_HEADERS.length } };
  log.columns.forEach((column) => { column.width = 20; });
  log.getColumn(PRIME_HEADERS.indexOf('PumpId') + 1).numFmt = '@';
  log.getColumn(PRIME_HEADERS.indexOf('ReplacementPumpId') + 1).numFmt = '@';
  for (const field of DATE_FIELDS) log.getColumn(PRIME_HEADERS.indexOf(field as (typeof PRIME_HEADERS)[number]) + 1).numFmt = 'yyyy-mm-dd hh:mm';
  return workbook;
}

function safeFilenamePart(value: string | number): string {
  return String(value).replace(/[^A-Za-z0-9_-]/g, '-');
}

@Injectable({ providedIn: 'root' })
export class PrimeExportService implements PrimeExportServiceContract {
  async exportStage(state: PrimeMaintenanceState): Promise<string> {
    const now = new Date();
    const { Workbook } = await import('exceljs');
    const workbook = populatePrimeWorkbook(new Workbook(), state, now.toISOString());
    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const token = now.toISOString().replace(/[-:]/g, '').slice(0, 13).replace('T', '_');
    const filename = `LUCTIV_${safeFilenamePart(state.stage.pad)}_SET${state.stage.setId}_W${safeFilenamePart(state.stage.well)}_S${state.stage.stage}_${token}.xlsx`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return filename;
  }
}
