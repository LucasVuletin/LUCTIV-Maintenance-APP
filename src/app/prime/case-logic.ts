import { FailureCase, FailureCaseInput, StageExecution } from '../core/models/prime.models';

function dateToken(timestamp: string): string {
  return timestamp.slice(0, 10).replaceAll('-', '');
}

export function calculateActualMinutes(workStartAt: string | null, workEndAt: string | null): number | null {
  if (!workStartAt || !workEndAt) return null;
  const elapsed = Date.parse(workEndAt) - Date.parse(workStartAt);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;
  return Math.round(elapsed / 60_000);
}

export function createOrUpdateFailureCase(
  cases: readonly FailureCase[],
  stage: StageExecution,
  input: FailureCaseInput,
  sequence: number,
  now: string,
): FailureCase {
  const openCase = cases.find((entry) => entry.affectedPumpId === input.affectedPumpId && !entry.closedAt);
  if (openCase) {
    return { ...openCase, ...input, firstDetectedAt: openCase.firstDetectedAt, updatedAt: now };
  }
  return {
    caseId: `CASE-${input.affectedPumpId}-${dateToken(now)}-${String(sequence).padStart(2, '0')}`,
    stageExecutionId: stage.stageExecutionId,
    affectedPumpId: input.affectedPumpId,
    replacementPumpId: null,
    firstDetectedAt: now,
    detectionSource: input.detectionSource,
    failureArea: input.failureArea,
    failureReason: input.failureReason,
    failureEvidence: input.failureEvidence,
    diagnosisStatus: input.diagnosisStatus,
    responsibleGroup: input.responsibleGroup,
    conditionClass: input.conditionClass,
    partOfPlan: 'No',
    sttOrder: null,
    sttReadiness: 'Waiting diagnosis',
    plannedAction: input.plannedAction,
    minutesToRecovery: input.minutesToRecovery,
    taskDescription: input.taskDescription,
    deferredReason: 'Pendiente de decisión operativa',
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
    ruleId: input.ruleId,
    ruleStatus: input.ruleStatus,
    technicalValidationConfirmedAt: null,
  };
}

export function applyCaseChanges(current: FailureCase, changes: Partial<FailureCase>, now: string): FailureCase {
  const workStartAt = changes.workStartAt === undefined ? current.workStartAt : changes.workStartAt;
  const workEndAt = changes.workEndAt === undefined ? current.workEndAt : changes.workEndAt;
  return {
    ...current,
    ...changes,
    caseId: current.caseId,
    firstDetectedAt: current.firstDetectedAt,
    createdAt: current.createdAt,
    actualMinutes: calculateActualMinutes(workStartAt, workEndAt),
    updatedAt: now,
  };
}
