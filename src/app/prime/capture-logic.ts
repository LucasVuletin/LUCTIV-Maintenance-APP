import { FailureCase, OperationalCapture, PrimeMaintenanceState, Pump, PumpStageLogRow } from '../core/models/prime.models';

function pumpPosition(pump: Pump): string {
  if (pump.side === 'bench') return 'Off set';
  return `${pump.side === 'left' ? 'Left' : 'Right'}-${String(pump.position).padStart(2, '0')}`;
}

function caseForPump(cases: readonly FailureCase[], pumpId: string): FailureCase | null {
  return cases.find((entry) => entry.affectedPumpId === pumpId && !entry.closedAt)
    ?? cases.find((entry) => entry.replacementPumpId === pumpId && !entry.closedAt)
    ?? cases.find((entry) => entry.affectedPumpId === pumpId)
    ?? cases.find((entry) => entry.replacementPumpId === pumpId)
    ?? null;
}

export function mapPumpToPrimeRow(state: PrimeMaintenanceState, pump: Pump, captureId: string, timestamp: string, index: number): PumpStageLogRow {
  const stage = state.stage;
  const failureCase = caseForPump(state.failureCases, pump.sap);
  const isReplacement = failureCase?.replacementPumpId === pump.sap;
  const manifold = state.manifolds.find((entry) => entry.id === pump.manifoldId);
  return {
    RecordId: `REC-${captureId.replace('CAP-', '')}-${pump.sap}-${String(index + 1).padStart(2, '0')}`,
    CaptureId: captureId,
    StageExecutionId: stage.stageExecutionId,
    CaptureTimestamp: timestamp,
    CapturedBy: stage.capturedBy,
    CaseId: failureCase?.caseId ?? '',
    Pad: stage.pad,
    SetId: stage.setId,
    SpreadIdentifier: stage.spreadIdentifier,
    CrewName: stage.crewName,
    Well: stage.well,
    Stage: stage.stage,
    PumpId: pump.sap,
    PumpType: pump.pumpType,
    Manifold: manifold?.label ?? 'Spare',
    ManifoldType: pump.side === 'bench' ? 'Off set' : pump.connection === 'clean' ? 'Clean' : 'Dirty',
    Position: pumpPosition(pump),
    PumpDistance: pump.pumpDistance,
    ActuatorNumber: pump.actuatorNumber,
    DGB_Bifuel: pump.isDgb ? 'Yes' : 'No',
    CurrentStatus: pump.currentStatus,
    ConditionClass: pump.conditionClass,
    DetectionSource: isReplacement ? 'A360' : failureCase?.detectionSource ?? '',
    FailureDetectedAt: isReplacement ? '' : failureCase?.firstDetectedAt ?? '',
    FailureArea: isReplacement ? '' : failureCase?.failureArea ?? '',
    FailureReason: isReplacement ? '' : failureCase?.failureReason ?? '',
    FailureEvidence: isReplacement ? '' : failureCase?.failureEvidence ?? '',
    DiagnosisStatus: isReplacement ? 'Not applicable' : failureCase?.diagnosisStatus ?? 'Not applicable',
    ResponsibleGroup: failureCase?.responsibleGroup ?? '',
    PartOfPlan: failureCase?.partOfPlan ?? 'No',
    STTOrder: isReplacement ? failureCase?.sttOrder === null ? null : (failureCase?.sttOrder ?? 0) + 2 : failureCase?.sttOrder ?? null,
    STTReadiness: failureCase?.sttReadiness ?? 'Not required',
    PlannedAction: isReplacement ? 'Rig In' : failureCase?.plannedAction ?? 'Stay Online',
    ReplacementPumpId: isReplacement ? '' : failureCase?.replacementPumpId ?? '',
    MinutesToRecovery: isReplacement ? 5 : failureCase?.minutesToRecovery ?? 0,
    TaskDescription: isReplacement ? `Replacement pump for Pump ${failureCase?.affectedPumpId}` : failureCase?.taskDescription ?? 'Continue operating',
    DeferredReason: failureCase?.deferredReason ?? '',
    WorkStatus: failureCase?.workStatus ?? 'Not required',
    WorkStartAt: failureCase?.workStartAt ?? '',
    WorkEndAt: failureCase?.workEndAt ?? '',
    ActualMinutes: failureCase?.actualMinutes ?? null,
    ActualAction: failureCase?.actualAction ?? '',
    ConfirmedFailureReason: failureCase?.confirmedFailureReason ?? '',
    ResolutionOutcome: failureCase?.resolutionOutcome ?? '',
    ReturnToServiceAt: failureCase?.returnToServiceAt ?? '',
    Comments: [failureCase?.comments, pump.supervisorComment].filter(Boolean).join(' · '),
    PumpRate: pump.pumpRate,
    PumpPressure: pump.pumpPressure,
    CleanRate: pump.cleanRate,
    DirtyRate: pump.dirtyRate,
    JobRate: pump.jobRate,
    OffsetWellPressure: pump.offsetWellPressure,
  };
}

export function createOperationalCapture(state: PrimeMaintenanceState, moment: OperationalCapture['moment'], now: string): OperationalCapture {
  const captureId = `CAP-${now.slice(0, 10).replaceAll('-', '')}-${String(state.captureSequence + 1).padStart(4, '0')}`;
  return {
    captureId,
    stageExecutionId: state.stage.stageExecutionId,
    captureTimestamp: now,
    capturedBy: state.stage.capturedBy,
    moment,
    rows: state.pumps.map((pump, index) => mapPumpToPrimeRow(state, pump, captureId, now, index)),
  };
}
