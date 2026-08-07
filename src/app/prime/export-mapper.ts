import { FailureCase, PrimeMaintenanceState } from '../core/models/prime.models';

export interface StageFailureSummaryRow {
  CaseId: string;
  PumpId: string;
  FailureDetectedAt: string;
  FailureEvidence: string;
  FailureReason: string;
  ConfirmedFailureReason: string;
  DiagnosisStatus: string;
  ResponsibleGroup: string;
  PartOfPlan: string;
  STTOrder: number | null;
  STTReadiness: string;
  PlannedAction: string;
  ActualAction: string;
  MinutesToRecovery: number | null;
  ActualMinutes: number | null;
  ReplacementPumpId: string;
  ResolutionOutcome: string;
  WorkStatus: string;
  ReturnToServiceAt: string;
  Comments: string;
}

export const SUMMARY_HEADERS = [
  'CaseId', 'PumpId', 'FailureDetectedAt', 'FailureEvidence', 'FailureReason', 'ConfirmedFailureReason',
  'DiagnosisStatus', 'ResponsibleGroup', 'PartOfPlan', 'STTOrder', 'STTReadiness', 'PlannedAction',
  'ActualAction', 'MinutesToRecovery', 'ActualMinutes', 'ReplacementPumpId', 'ResolutionOutcome',
  'WorkStatus', 'ReturnToServiceAt', 'Comments',
] as const;

export function mapFailureSummary(failureCases: readonly FailureCase[]): StageFailureSummaryRow[] {
  return failureCases.map((failureCase) => ({
    CaseId: failureCase.caseId,
    PumpId: failureCase.affectedPumpId,
    FailureDetectedAt: failureCase.firstDetectedAt,
    FailureEvidence: failureCase.failureEvidence,
    FailureReason: failureCase.failureReason,
    ConfirmedFailureReason: failureCase.confirmedFailureReason,
    DiagnosisStatus: failureCase.diagnosisStatus,
    ResponsibleGroup: failureCase.responsibleGroup,
    PartOfPlan: failureCase.partOfPlan,
    STTOrder: failureCase.sttOrder,
    STTReadiness: failureCase.sttReadiness,
    PlannedAction: failureCase.plannedAction,
    ActualAction: failureCase.actualAction,
    MinutesToRecovery: failureCase.minutesToRecovery,
    ActualMinutes: failureCase.actualMinutes,
    ReplacementPumpId: failureCase.replacementPumpId ?? '',
    ResolutionOutcome: failureCase.resolutionOutcome,
    WorkStatus: failureCase.workStatus,
    ReturnToServiceAt: failureCase.returnToServiceAt ?? '',
    Comments: failureCase.comments,
  }));
}

export function stageMetadata(state: PrimeMaintenanceState, exportedAt: string): [string, string | number][] {
  const available = state.pumps.filter((pump) => ['Rigged In - Working', 'Rigged Out - Working', 'Ready'].includes(pump.currentStatus)).length;
  const broken = state.pumps.filter((pump) => pump.conditionClass === 'Broken').length;
  const nearLimit = state.pumps.filter((pump) => pump.conditionClass === 'Almost / Consumable').length;
  return [
    ['PRIME schema version', '1.0'], ['Pad', state.stage.pad], ['Set', state.stage.setId],
    ['Spread', state.stage.spreadIdentifier], ['Crew', state.stage.crewName], ['Well', state.stage.well],
    ['Stage', state.stage.stage], ['StageExecutionId', state.stage.stageExecutionId], ['Export timestamp', exportedAt],
    ['Exported by', state.stage.exportedBy], ['Total pumps', state.pumps.length], ['Available pumps', available],
    ['Broken pumps', broken], ['Near-limit pumps', nearLimit],
    ['Open cases', state.failureCases.filter((entry) => !entry.closedAt).length],
    ['Selected STT cases', state.failureCases.filter((entry) => !entry.closedAt && entry.partOfPlan === 'Yes').length],
    ['Closed cases', state.failureCases.filter((entry) => Boolean(entry.closedAt)).length],
  ];
}
