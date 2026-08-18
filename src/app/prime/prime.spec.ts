import { createPrimeDemoState } from '../core/data/prime-demo-state';
import { DEFAULT_PUMP_INVENTORY } from '../core/data/default-pump-inventory';
import { FailureCaseInput } from '../core/models/prime.models';
import { migrateLegacyState } from '../core/services/local-maintenance.repository';
import { calculateActualMinutes, createOrUpdateFailureCase } from './case-logic';
import { createOperationalCapture } from './capture-logic';
import { mapFailureSummary } from './export-mapper';
import { findFailureRule, requiresTechnicalValidation } from './failure-rules';
import { PRIME_HEADERS } from './schema';
import { validateFailureCase } from './validation';

const exactHeaders = [
  'RecordId', 'CaptureId', 'StageExecutionId', 'CaptureTimestamp', 'CapturedBy', 'CaseId', 'Pad', 'SetId',
  'SpreadIdentifier', 'CrewName', 'Well', 'Stage', 'PumpId', 'PumpType', 'Manifold', 'ManifoldType', 'Position',
  'PumpDistance', 'ActuatorNumber', 'DGB_Bifuel', 'CurrentStatus', 'ConditionClass', 'DetectionSource',
  'FailureDetectedAt', 'FailureArea', 'FailureReason', 'FailureEvidence', 'DiagnosisStatus', 'ResponsibleGroup',
  'PartOfPlan', 'STTOrder', 'STTReadiness', 'PlannedAction', 'ReplacementPumpId', 'MinutesToRecovery',
  'TaskDescription', 'DeferredReason', 'WorkStatus', 'WorkStartAt', 'WorkEndAt', 'ActualMinutes', 'ActualAction',
  'ConfirmedFailureReason', 'ResolutionOutcome', 'ReturnToServiceAt', 'Comments', 'PumpRate', 'PumpPressure',
  'CleanRate', 'DirtyRate', 'JobRate', 'OffsetWellPressure',
];

function input(pumpId = '6672'): FailureCaseInput {
  return {
    affectedPumpId: pumpId,
    detectionSource: 'Manual - Field',
    failureArea: 'Fluid end',
    failureReason: 'Empaque',
    failureEvidence: 'Evidencia física',
    diagnosisStatus: 'Suspected',
    responsibleGroup: 'PE',
    conditionClass: 'Almost / Consumable',
    plannedAction: 'Repair In-Line',
    minutesToRecovery: 12,
    taskDescription: 'Inspeccionar empaque',
    ruleId: 'RULE-002',
    ruleStatus: 'Source example',
  };
}

describe('PRIME case lifecycle', () => {
  it('reuses an open CaseId for repeated detection', () => {
    const state = createPrimeDemoState();
    const first = createOrUpdateFailureCase([], state.stage, input(), 1, '2026-08-06T10:00:00.000Z');
    const repeated = createOrUpdateFailureCase([first], state.stage, { ...input(), failureEvidence: 'Nueva evidencia' }, 1, '2026-08-06T10:05:00.000Z');
    expect(repeated.caseId).toBe(first.caseId);
    expect(repeated.firstDetectedAt).toBe(first.firstDetectedAt);
    expect(repeated.failureEvidence).toBe('Nueva evidencia');
  });

  it('creates a new CaseId after closure', () => {
    const state = createPrimeDemoState();
    const first = createOrUpdateFailureCase([], state.stage, input(), 1, '2026-08-06T10:00:00.000Z');
    const next = createOrUpdateFailureCase([{ ...first, closedAt: '2026-08-06T10:30:00.000Z' }], state.stage, input(), 2, '2026-08-06T11:00:00.000Z');
    expect(next.caseId).not.toBe(first.caseId);
    expect(next.caseId).toBe('CASE-6672-20260806-02');
  });

  it('validates PartOfPlan and DeferredReason rules', () => {
    const state = createPrimeDemoState();
    const base = createOrUpdateFailureCase([], state.stage, input(), 1, '2026-08-06T10:00:00.000Z');
    const selectedErrors = validateFailureCase({ ...base, partOfPlan: 'Yes', sttOrder: null }, state.pumps);
    expect(selectedErrors.sttOrder).toBeTruthy();
    const backlogErrors = validateFailureCase({ ...base, partOfPlan: 'No', deferredReason: '', workStatus: 'Backlog' }, state.pumps);
    expect(backlogErrors.deferredReason).toBeTruthy();
  });

  it('keeps Draft rules as suggestions requiring human validation', () => {
    const rule = findFailureRule('Baja presión de lubricante');
    expect(requiresTechnicalValidation(rule)).toBe(true);
    const state = createPrimeDemoState();
    const failureCase = createOrUpdateFailureCase([], state.stage, { ...input('7720'), failureReason: rule!.FailureReason, ruleId: rule!.RuleId, ruleStatus: 'Draft - technical validation required' }, 1, '2026-08-06T10:00:00.000Z');
    expect(failureCase.diagnosisStatus).toBe('Suspected');
    expect(failureCase.confirmedFailureReason).toBe('');
    const errors = validateFailureCase({ ...failureCase, confirmedFailureReason: rule!.FailureReason, workEndAt: '2026-08-06T10:15:00.000Z' }, state.pumps);
    expect(errors.confirmedFailureReason).toContain('validación técnica humana');
  });

  it('calculates ActualMinutes from timestamps', () => {
    expect(calculateActualMinutes('2026-08-06T10:00:00.000Z', '2026-08-06T10:12:00.000Z')).toBe(12);
    expect(calculateActualMinutes('2026-08-06T10:12:00.000Z', '2026-08-06T10:00:00.000Z')).toBeNull();
  });
});

describe('PRIME capture and export mapping', () => {
  it('links affected and replacement pumps to the same case', () => {
    const state = createPrimeDemoState();
    const capture = createOperationalCapture(state, 'Manual', '2026-08-06T12:00:00.000Z');
    const affected = capture.rows.find((row) => row.PumpId === '2268');
    const replacement = capture.rows.find((row) => row.PumpId === '2230');
    expect(replacement?.CaseId).toBe(affected?.CaseId);
    expect(affected?.ReplacementPumpId).toBe('2230');
  });

  it('groups every spread pump under one CaptureId', () => {
    const state = createPrimeDemoState();
    const capture = createOperationalCapture(state, 'Manual', '2026-08-06T12:00:00.000Z');
    expect(capture.rows).toHaveLength(41);
    expect(new Set(capture.rows.map((row) => row.CaptureId))).toEqual(new Set([capture.captureId]));
  });

  it('loads the complete LUCTIV inventory without overlapping spread slots', () => {
    const state = createPrimeDemoState();
    expect(state.pumps.map((pump) => pump.sap)).toEqual(DEFAULT_PUMP_INVENTORY.map((pump) => pump.sap));
    expect(state.pumps).toHaveLength(41);
    expect(state.pumps.filter((pump) => pump.side !== 'bench')).toHaveLength(32);
    expect(state.pumps.filter((pump) => pump.side === 'bench')).toHaveLength(9);
    const occupiedSlots = state.pumps.filter((pump) => pump.side !== 'bench').map((pump) => `${pump.manifoldId}:${pump.side}:${pump.position}`);
    expect(new Set(occupiedSlots).size).toBe(32);
  });

  it('uses the exact 52-column PRIME order', () => {
    expect(PRIME_HEADERS).toHaveLength(52);
    expect([...PRIME_HEADERS]).toEqual(exactHeaders);
  });

  it('maps exactly one summary row per maintenance case', () => {
    const state = createPrimeDemoState();
    const summary = mapFailureSummary(state.failureCases);
    expect(summary).toHaveLength(state.failureCases.length);
    expect(new Set(summary.map((row) => row.CaseId)).size).toBe(summary.length);
  });
});

describe('local storage migration', () => {
  it('converts legacy pumps, unresolved alerts and linked STT tasks', () => {
    const migrated = migrateLegacyState({
      schemaVersion: 2,
      selectedSet: 5,
      stageContext: { pad: 'PAD-X', primary: { well: '12', stage: '7' } },
      manifolds: [{ id: 'm1', label: 'MFD-01', type: 'dirty', pumpsPerSide: 8 }],
      pumps: [{ id: 'p1', sap: '1234', side: 'left', manifoldId: 'm1', row: 0, connection: 'dirty', position: 1, operationState: 'non-operative', isDgb: false, signals: { p: 1, d: 2, s: 3 } }],
      operationalEvents: [{ pumpSap: '1234', createdAt: '2026-08-06T10:00:00.000Z', offlineReason: 'Empaque', category: 'Manual', department: 'PE', decision: 'pending', recommendedAction: 'Reparar' }],
      interstagePlan: { targetMinutes: 15, tasks: [{ pumpSap: '1234', action: 'Repair In-Line', detail: 'Cambiar empaque', createdAt: '2026-08-06T10:05:00.000Z' }] },
    });
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.pumps[0].sap).toBe('1234');
    expect(migrated.failureCases).toHaveLength(1);
    expect(migrated.failureCases[0].taskDescription).toContain('Cambiar empaque');
  });
});
