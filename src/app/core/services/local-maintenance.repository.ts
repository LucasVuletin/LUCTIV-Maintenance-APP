import { Injectable } from '@angular/core';
import { createPrimeDemoState } from '../data/prime-demo-state';
import { FailureCase, PrimeMaintenanceState, Pump, SetNumber } from '../models/prime.models';
import { MaintenanceRepository } from './maintenance-repository';

export const PRIME_STORAGE_KEY = 'luctiv-maintenance-state-v3-prime';
export const LEGACY_STORAGE_KEY = 'luctiv-maintenance-state-v2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown>, key: string, fallback = ''): string {
  const value = record[key];
  return typeof value === 'string' ? value : fallback;
}

function numberValue(record: Record<string, unknown>, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function migratePump(record: Record<string, unknown>, index: number): Pump {
  const signals = isRecord(record['signals']) ? record['signals'] : {};
  const sideValue = stringValue(record, 'side', 'bench');
  const connectionValue = stringValue(record, 'connection', 'none');
  const operationState = stringValue(record, 'operationState', 'operative');
  return {
    id: stringValue(record, 'id', `pump-migrated-${index + 1}`),
    sap: stringValue(record, 'sap', String(index + 1).padStart(4, '0')),
    pumpType: 'Fracturing pump',
    pumpModel: record['signalColumnCount'] === 5 ? 'Q10' : 'HT200',
    side: sideValue === 'left' || sideValue === 'right' ? sideValue : 'bench',
    manifoldId: typeof record['manifoldId'] === 'string' ? record['manifoldId'] : null,
    row: numberValue(record, 'row', index),
    connection: connectionValue === 'clean' || connectionValue === 'dirty' ? connectionValue : 'none',
    position: numberValue(record, 'position', index + 1),
    actuatorNumber: '',
    isDgb: record['isDgb'] === true,
    dgbSubstitutionPercentage: numberValue(record, 'substitutionPercentage', 0),
    dgbSubstitutionError: stringValue(record, 'substitutionError'),
    supervisorComment: stringValue(record, 'supervisorComment'),
    dynamicStatus: operationState === 'operative' ? sideValue === 'bench' ? 'available' : 'running' : 'offline',
    signals: {
      p: numberValue(signals, 'p', 1),
      d: numberValue(signals, 'd', 1),
      s: numberValue(signals, 's', 1),
    },
    currentStatus: sideValue === 'bench'
      ? operationState === 'operative' ? 'Rigged Out - Working' : 'Rigged Out - Not Working'
      : operationState === 'operative' ? 'Rigged In - Working' : 'Rigged In - Not Working',
    conditionClass: operationState === 'operative' ? 'Healthy / Available' : 'Under diagnosis',
    pumpDistance: null,
    pumpRate: null,
    pumpPressure: null,
    cleanRate: null,
    dirtyRate: null,
    jobRate: null,
    offsetWellPressure: null,
  };
}

function preliminaryCase(stageExecutionId: string, pumpId: string, now: string, details: Partial<FailureCase>): FailureCase {
  return {
    caseId: `CASE-${pumpId}-${now.slice(0, 10).replaceAll('-', '')}-01`,
    stageExecutionId,
    affectedPumpId: pumpId,
    replacementPumpId: null,
    firstDetectedAt: now,
    detectionSource: 'Manual - Field',
    failureArea: 'Unknown',
    failureReason: 'Otro',
    failureEvidence: 'Migrado desde almacenamiento LUCTIV anterior.',
    diagnosisStatus: 'Under diagnosis',
    responsibleGroup: 'Unknown',
    conditionClass: 'Under diagnosis',
    partOfPlan: 'No',
    sttOrder: null,
    sttReadiness: 'Waiting diagnosis',
    plannedAction: 'Diagnose',
    minutesToRecovery: null,
    taskDescription: 'Revisar evento migrado.',
    deferredReason: 'Pendiente de caracterización PRIME.',
    workStatus: 'Backlog',
    workStartAt: null,
    workEndAt: null,
    actualMinutes: null,
    actualAction: '',
    confirmedFailureReason: '',
    resolutionOutcome: '',
    returnToServiceAt: null,
    comments: '',
    createdAt: now,
    updatedAt: now,
    closedAt: null,
    acknowledgedAt: null,
    ruleId: null,
    ruleStatus: null,
    technicalValidationConfirmedAt: null,
    queueClearedAt: null,
    ...details,
  };
}

export function migrateLegacyState(raw: unknown): PrimeMaintenanceState {
  const fallback = createPrimeDemoState();
  if (!isRecord(raw)) return fallback;
  const pumps = arrayRecords(raw['pumps']).map(migratePump);
  const stageContext = isRecord(raw['stageContext']) ? raw['stageContext'] : {};
  const primary = isRecord(stageContext['primary']) ? stageContext['primary'] : {};
  const pad = stringValue(stageContext, 'pad', 'PAD-MIGRADO');
  const well = stringValue(primary, 'well', '0');
  const stageNumber = Number(stringValue(primary, 'stage', '0')) || 0;
  const selectedSet = numberValue(raw, 'selectedSet', 5) as SetNumber;
  const now = new Date().toISOString();
  const stageExecutionId = `${pad}-SET${selectedSet}-W${well}-S${stageNumber}`.replaceAll(' ', '-');
  const cases: FailureCase[] = arrayRecords(raw['operationalEvents']).map((event) => {
    const pumpId = stringValue(event, 'pumpSap', 'UNKNOWN');
    const createdAt = stringValue(event, 'createdAt', now);
    return preliminaryCase(stageExecutionId, pumpId, createdAt, {
      caseId: `CASE-${pumpId}-${createdAt.slice(0, 10).replaceAll('-', '')}-01`,
      failureReason: stringValue(event, 'offlineReason', 'Otro'),
      failureEvidence: `Evento operacional migrado: ${stringValue(event, 'category')}.`,
      responsibleGroup: stringValue(event, 'department', 'Unknown'),
      taskDescription: stringValue(event, 'recommendedAction', 'Revisar evento migrado.'),
      replacementPumpId: stringValue(event, 'replacementPumpSap') || null,
      comments: `Decisión anterior: ${stringValue(event, 'decision', 'pending')}. ${stringValue(event, 'responseComment')}`.trim(),
      acknowledgedAt: stringValue(event, 'respondedAt') || null,
    });
  });
  const interstagePlan = isRecord(raw['interstagePlan']) ? raw['interstagePlan'] : {};
  for (const task of arrayRecords(interstagePlan['tasks'])) {
    const pumpId = stringValue(task, 'pumpSap');
    if (!pumpId) continue;
    const details = `${stringValue(task, 'action')} — ${stringValue(task, 'detail')}`.trim();
    const existing = cases.find((entry) => entry.affectedPumpId === pumpId && !entry.closedAt);
    if (existing) {
      existing.taskDescription = details || existing.taskDescription;
      existing.comments = `${existing.comments} Tarea STT migrada: ${details}`.trim();
    } else {
      cases.push(preliminaryCase(stageExecutionId, pumpId, stringValue(task, 'createdAt', now), {
        taskDescription: details || 'Tarea STT migrada.',
        comments: 'Creado al vincular una tarea interetapa anterior.',
      }));
    }
  }
  return {
    schemaVersion: 3,
    stage: {
      stageExecutionId,
      mode: 'zipperfrac',
      pad,
      setId: selectedSet,
      spreadIdentifier: 'SPREAD-MIGRADO',
      crewName: 'Crew sin migrar',
      well,
      stage: stageNumber,
      secondaryWell: '',
      secondaryStage: null,
      capturedBy: 'Usuario migrado',
      exportedBy: 'Usuario migrado',
      targetMinutes: numberValue(interstagePlan, 'targetMinutes', 15),
      status: 'active',
      startedAt: now,
      closedAt: null,
    },
    manifolds: arrayRecords(raw['manifolds']).map((manifold, index) => ({
      id: stringValue(manifold, 'id', `manifold-${index + 1}`),
      label: stringValue(manifold, 'label', `MF-${index + 1}`),
      type: stringValue(manifold, 'type') === 'clean' ? 'clean' : 'dirty',
      pumpsPerSide: numberValue(manifold, 'pumpsPerSide', 8),
    })),
    pumps: pumps.length ? pumps : fallback.pumps,
    slotActuators: isRecord(raw['slotActuators'])
      ? Object.fromEntries(Object.entries(raw['slotActuators']).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {},
    failureCases: cases.map((failureCase) => ({ ...failureCase, queueClearedAt: failureCase.queueClearedAt ?? null })),
    captures: [],
    caseSequenceByPump: Object.fromEntries(cases.map((failureCase) => [failureCase.affectedPumpId, 1])),
    captureSequence: 0,
  };
}

function isPrimeState(value: unknown): value is PrimeMaintenanceState {
  return isRecord(value) && value['schemaVersion'] === 3 && isRecord(value['stage']) && Array.isArray(value['pumps']) && Array.isArray(value['failureCases']) && Array.isArray(value['captures']);
}

function normalizePrimeState(state: PrimeMaintenanceState): PrimeMaintenanceState {
  const mode = ['zipperfrac', 'simulfrac', 'dualfrac'].includes(state.stage.mode) ? state.stage.mode : 'zipperfrac';
  return {
    ...state,
    stage: {
      ...state.stage,
      mode,
      secondaryWell: state.stage.secondaryWell ?? '',
      secondaryStage: state.stage.secondaryStage ?? null,
    },
    failureCases: state.failureCases.map((failureCase) => ({ ...failureCase, queueClearedAt: failureCase.queueClearedAt ?? null })),
    pumps: state.pumps.map((pump) => ({
      ...pump,
      dgbSubstitutionPercentage: pump.dgbSubstitutionPercentage ?? 0,
      dgbSubstitutionError: pump.dgbSubstitutionError ?? '',
      supervisorComment: pump.supervisorComment ?? '',
      pumpModel: pump.pumpModel === 'Q10' ? 'Q10' : 'HT200',
      dynamicStatus: pump.dynamicStatus
        ?? (pump.currentStatus === 'In Maintenance'
          ? 'maintenance'
          : pump.conditionClass === 'Broken'
            ? 'down'
            : pump.currentStatus.includes('Not Working')
              ? 'offline'
              : ['Almost / Consumable', 'Operational condition'].includes(pump.conditionClass)
                ? 'warning'
                : pump.side === 'bench' || pump.currentStatus === 'Ready' ? 'available' : 'running'),
    })),
  };
}

@Injectable({ providedIn: 'root' })
export class LocalMaintenanceRepository implements MaintenanceRepository {
  load(): PrimeMaintenanceState {
    try {
      const current = localStorage.getItem(PRIME_STORAGE_KEY);
      if (current) {
        const parsed: unknown = JSON.parse(current);
        if (isPrimeState(parsed)) return normalizePrimeState(parsed);
      }
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const migrated = migrateLegacyState(JSON.parse(legacy) as unknown);
        this.save(migrated);
        return migrated;
      }
    } catch {
      return createPrimeDemoState();
    }
    return createPrimeDemoState();
  }

  save(state: PrimeMaintenanceState): void {
    localStorage.setItem(PRIME_STORAGE_KEY, JSON.stringify(state));
  }

  loadPrimeDemo(): PrimeMaintenanceState {
    const state = createPrimeDemoState();
    this.save(state);
    return state;
  }
}
