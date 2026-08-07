import { FailureCase, Manifold, OperationalCapture, PrimeMaintenanceState, Pump, PumpStageLogRow, SetNumber } from '../models/prime.models';
import { findFailureRule } from '../../prime/failure-rules';
import { PRIME_EXAMPLE_ROWS } from '../../prime/generated/prime.generated';

function stringValue(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  return value === null || value === undefined ? '' : String(value);
}

function numberValue(row: Record<string, unknown>, field: string): number | null {
  const value = row[field];
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoValue(row: Record<string, unknown>, field: string): string | null {
  const value = stringValue(row, field);
  return value ? new Date(value).toISOString() : null;
}

function parsePosition(position: string): { side: Pump['side']; position: number } {
  if (position === 'Off set') return { side: 'bench', position: 1 };
  const [side, slot] = position.split('-');
  return { side: side === 'Right' ? 'right' : 'left', position: Number(slot) };
}

function createPumps(rows: readonly Record<string, unknown>[], manifolds: readonly Manifold[]): Pump[] {
  let benchIndex = 0;
  return rows.map((row, index) => {
    const parsedPosition = parsePosition(stringValue(row, 'Position'));
    const manifold = manifolds.find((entry) => entry.label === stringValue(row, 'Manifold'));
    const position = parsedPosition.side === 'bench' ? ++benchIndex : parsedPosition.position;
    return {
      id: `pump-${stringValue(row, 'PumpId')}`,
      sap: stringValue(row, 'PumpId').padStart(4, '0'),
      pumpType: stringValue(row, 'PumpType'),
      side: parsedPosition.side,
      manifoldId: manifold?.id ?? null,
      row: position - 1,
      connection: parsedPosition.side === 'bench' ? 'none' : stringValue(row, 'ManifoldType') === 'Clean' ? 'clean' : 'dirty',
      position,
      actuatorNumber: stringValue(row, 'ActuatorNumber'),
      isDgb: stringValue(row, 'DGB_Bifuel') === 'Yes',
      signals: { p: 1, d: 1, s: 1 },
      currentStatus: stringValue(row, 'CurrentStatus'),
      conditionClass: stringValue(row, 'ConditionClass'),
      pumpDistance: numberValue(row, 'PumpDistance'),
      pumpRate: numberValue(row, 'PumpRate'),
      pumpPressure: numberValue(row, 'PumpPressure'),
      cleanRate: numberValue(row, 'CleanRate'),
      dirtyRate: numberValue(row, 'DirtyRate'),
      jobRate: numberValue(row, 'JobRate'),
      offsetWellPressure: numberValue(row, 'OffsetWellPressure'),
    };
  });
}

function createCases(rows: readonly Record<string, unknown>[], stageExecutionId: string): FailureCase[] {
  const caseRows = rows.filter((row) => stringValue(row, 'CaseId') && stringValue(row, 'FailureReason'));
  return caseRows.map((row) => {
    const firstDetectedAt = isoValue(row, 'FailureDetectedAt') ?? new Date().toISOString();
    const failureReason = stringValue(row, 'FailureReason');
    const rule = findFailureRule(failureReason);
    const workStartAt = isoValue(row, 'WorkStartAt');
    const workEndAt = isoValue(row, 'WorkEndAt');
    return {
      caseId: stringValue(row, 'CaseId'),
      stageExecutionId,
      affectedPumpId: stringValue(row, 'PumpId'),
      replacementPumpId: stringValue(row, 'ReplacementPumpId') || null,
      firstDetectedAt,
      detectionSource: stringValue(row, 'DetectionSource'),
      failureArea: stringValue(row, 'FailureArea'),
      failureReason,
      failureEvidence: stringValue(row, 'FailureEvidence'),
      diagnosisStatus: stringValue(row, 'DiagnosisStatus'),
      responsibleGroup: stringValue(row, 'ResponsibleGroup'),
      conditionClass: stringValue(row, 'ConditionClass'),
      partOfPlan: stringValue(row, 'PartOfPlan') === 'Yes' ? 'Yes' : 'No',
      sttOrder: numberValue(row, 'STTOrder'),
      sttReadiness: stringValue(row, 'STTReadiness'),
      plannedAction: stringValue(row, 'PlannedAction'),
      minutesToRecovery: numberValue(row, 'MinutesToRecovery'),
      taskDescription: stringValue(row, 'TaskDescription'),
      deferredReason: stringValue(row, 'DeferredReason'),
      workStatus: stringValue(row, 'WorkStatus'),
      workStartAt,
      workEndAt,
      actualMinutes: numberValue(row, 'ActualMinutes'),
      actualAction: stringValue(row, 'ActualAction'),
      confirmedFailureReason: stringValue(row, 'ConfirmedFailureReason'),
      resolutionOutcome: stringValue(row, 'ResolutionOutcome'),
      returnToServiceAt: isoValue(row, 'ReturnToServiceAt'),
      comments: stringValue(row, 'Comments'),
      createdAt: firstDetectedAt,
      updatedAt: firstDetectedAt,
      closedAt: null,
      acknowledgedAt: null,
      ruleId: rule?.RuleId ?? null,
      ruleStatus: rule?.RuleStatus === 'Source example' ? 'Source example' : 'Draft - technical validation required',
      technicalValidationConfirmedAt: null,
    };
  });
}

export function createPrimeDemoState(): PrimeMaintenanceState {
  const rows = PRIME_EXAMPLE_ROWS.map((row) => row as unknown as Record<string, unknown>);
  const first = rows[0];
  const stageExecutionId = stringValue(first, 'StageExecutionId');
  const captureTimestamp = isoValue(first, 'CaptureTimestamp') ?? new Date().toISOString();
  const manifolds: Manifold[] = [
    { id: 'manifold-dirty-1', label: 'MFD-01', type: 'dirty', pumpsPerSide: 8 },
    { id: 'manifold-clean-1', label: 'MFC-01', type: 'clean', pumpsPerSide: 8 },
  ];
  const pumps = createPumps(rows, manifolds);
  const failureCases = createCases(rows, stageExecutionId);
  const capture: OperationalCapture = {
    captureId: stringValue(first, 'CaptureId'),
    stageExecutionId,
    captureTimestamp,
    capturedBy: stringValue(first, 'CapturedBy'),
    moment: 'STT plan confirmation',
    rows: rows.map((row) => row as unknown as PumpStageLogRow),
  };
  return {
    schemaVersion: 3,
    stage: {
      stageExecutionId,
      pad: stringValue(first, 'Pad'),
      setId: numberValue(first, 'SetId') as SetNumber,
      spreadIdentifier: stringValue(first, 'SpreadIdentifier'),
      crewName: stringValue(first, 'CrewName'),
      well: stringValue(first, 'Well'),
      stage: numberValue(first, 'Stage') ?? 0,
      capturedBy: stringValue(first, 'CapturedBy'),
      exportedBy: stringValue(first, 'CapturedBy'),
      targetMinutes: 15,
      status: 'active',
      startedAt: captureTimestamp,
      closedAt: null,
    },
    manifolds,
    pumps,
    slotActuators: {},
    failureCases,
    captures: [capture],
    caseSequenceByPump: Object.fromEntries(failureCases.map((failureCase) => [failureCase.affectedPumpId, 1])),
    captureSequence: 51,
  };
}
