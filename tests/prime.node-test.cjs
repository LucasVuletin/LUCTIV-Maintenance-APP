const assert = require('node:assert/strict');
const { test } = require('node:test');
const prime = require('../.prime-test-build/tests/prime-test-entry.js');

const failureInput = (pumpId = '6672') => ({ affectedPumpId: pumpId, detectionSource: 'Manual - Field', failureArea: 'Fluid end', failureReason: 'Empaque', failureEvidence: 'Evidencia física', diagnosisStatus: 'Suspected', responsibleGroup: 'PE', conditionClass: 'Almost / Consumable', plannedAction: 'Repair In-Line', minutesToRecovery: 12, taskDescription: 'Inspeccionar empaque', ruleId: 'RULE-002', ruleStatus: 'Source example' });

test('reuses the open CaseId', () => {
  const state = prime.createPrimeDemoState();
  const first = prime.createOrUpdateFailureCase([], state.stage, failureInput(), 1, '2026-08-06T10:00:00.000Z');
  const repeated = prime.createOrUpdateFailureCase([first], state.stage, { ...failureInput(), failureEvidence: 'Nueva evidencia' }, 1, '2026-08-06T10:05:00.000Z');
  assert.equal(repeated.caseId, first.caseId);
  assert.equal(repeated.firstDetectedAt, first.firstDetectedAt);
});

test('creates a new CaseId after closure', () => {
  const state = prime.createPrimeDemoState();
  const first = prime.createOrUpdateFailureCase([], state.stage, failureInput(), 1, '2026-08-06T10:00:00.000Z');
  const next = prime.createOrUpdateFailureCase([{ ...first, closedAt: '2026-08-06T10:30:00.000Z' }], state.stage, failureInput(), 2, '2026-08-06T11:00:00.000Z');
  assert.equal(next.caseId, 'CASE-6672-20260806-02');
});

test('validates PartOfPlan and DeferredReason', () => {
  const state = prime.createPrimeDemoState();
  const base = prime.createOrUpdateFailureCase([], state.stage, failureInput(), 1, '2026-08-06T10:00:00.000Z');
  assert.ok(prime.validateFailureCase({ ...base, partOfPlan: 'Yes', sttOrder: null }, state.pumps).sttOrder);
  assert.ok(prime.validateFailureCase({ ...base, partOfPlan: 'No', deferredReason: '', workStatus: 'Backlog' }, state.pumps).deferredReason);
});

test('requires human confirmation for Draft rules', () => {
  const rule = prime.findFailureRule('Baja presión de lubricante');
  assert.equal(prime.requiresTechnicalValidation(rule), true);
  const state = prime.createPrimeDemoState();
  const failureCase = prime.createOrUpdateFailureCase([], state.stage, { ...failureInput('7720'), failureReason: rule.FailureReason, ruleId: rule.RuleId, ruleStatus: 'Draft - technical validation required' }, 1, '2026-08-06T10:00:00.000Z');
  const errors = prime.validateFailureCase({ ...failureCase, confirmedFailureReason: rule.FailureReason, workEndAt: '2026-08-06T10:15:00.000Z' }, state.pumps);
  assert.match(errors.confirmedFailureReason || '', /validación técnica humana/);
});

test('calculates ActualMinutes from timestamps', () => {
  assert.equal(prime.calculateActualMinutes('2026-08-06T10:00:00.000Z', '2026-08-06T10:12:00.000Z'), 12);
  assert.equal(prime.calculateActualMinutes('2026-08-06T10:12:00.000Z', '2026-08-06T10:00:00.000Z'), null);
});

test('links replacement and affected pumps to one case', () => {
  const capture = prime.createOperationalCapture(prime.createPrimeDemoState(), 'Manual', '2026-08-06T12:00:00.000Z');
  const affected = capture.rows.find((row) => row.PumpId === '2268');
  const replacement = capture.rows.find((row) => row.PumpId === '2230');
  assert.equal(replacement.CaseId, affected.CaseId);
  assert.equal(affected.ReplacementPumpId, '2230');
});

test('groups every spread pump under one CaptureId', () => {
  const capture = prime.createOperationalCapture(prime.createPrimeDemoState(), 'Manual', '2026-08-06T12:00:00.000Z');
  assert.equal(capture.rows.length, 8);
  assert.deepEqual([...new Set(capture.rows.map((row) => row.CaptureId))], [capture.captureId]);
});

test('preserves exact 52-column export order', () => {
  assert.equal(prime.PRIME_HEADERS.length, 52);
  assert.equal(prime.PRIME_HEADERS[0], 'RecordId');
  assert.equal(prime.PRIME_HEADERS[51], 'OffsetWellPressure');
});

test('maps one summary row per case', () => {
  const state = prime.createPrimeDemoState();
  const summary = prime.mapFailureSummary(state.failureCases);
  assert.equal(summary.length, state.failureCases.length);
  assert.equal(new Set(summary.map((row) => row.CaseId)).size, summary.length);
});

test('migrates legacy pumps, alerts and linked STT tasks', () => {
  const migrated = prime.migrateLegacyState({ schemaVersion: 2, selectedSet: 5, stageContext: { pad: 'PAD-X', primary: { well: '12', stage: '7' } }, manifolds: [{ id: 'm1', label: 'MFD-01', type: 'dirty', pumpsPerSide: 8 }], pumps: [{ id: 'p1', sap: '1234', side: 'left', manifoldId: 'm1', row: 0, connection: 'dirty', position: 1, operationState: 'non-operative', isDgb: false, signals: { p: 1, d: 2, s: 3 } }], operationalEvents: [{ pumpSap: '1234', createdAt: '2026-08-06T10:00:00.000Z', offlineReason: 'Empaque', category: 'Manual', department: 'PE', decision: 'pending', recommendedAction: 'Reparar' }], interstagePlan: { targetMinutes: 15, tasks: [{ pumpSap: '1234', action: 'Repair In-Line', detail: 'Cambiar empaque', createdAt: '2026-08-06T10:05:00.000Z' }] } });
  assert.equal(migrated.schemaVersion, 3);
  assert.equal(migrated.pumps[0].sap, '1234');
  assert.equal(migrated.failureCases.length, 1);
  assert.match(migrated.failureCases[0].taskDescription, /Cambiar empaque/);
});
