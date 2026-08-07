export const PRIME_SCHEMA_VERSION = '1.0';
export const APP_STORAGE_SCHEMA_VERSION = 3 as const;

export type SetNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type PumpSide = 'left' | 'right' | 'bench';
export type PumpConnection = 'clean' | 'dirty' | 'none';
export type ManifoldType = 'clean' | 'dirty';
export type CaptureMoment = 'Stage start' | 'Failure detection' | 'STT plan confirmation' | 'STT completion' | 'Stage close' | 'Manual';
export type CaseRuleStatus = 'Source example' | 'Draft - technical validation required' | null;

export interface Manifold {
  id: string;
  label: string;
  type: ManifoldType;
  pumpsPerSide: number;
}

export interface PumpSignals {
  p: number;
  d: number;
  s: number;
}

export interface Pump {
  id: string;
  sap: string;
  pumpType: string;
  side: PumpSide;
  manifoldId: string | null;
  row: number;
  connection: PumpConnection;
  position: number;
  actuatorNumber: string;
  isDgb: boolean;
  signals: PumpSignals;
  currentStatus: string;
  conditionClass: string;
  pumpDistance: number | null;
  pumpRate: number | null;
  pumpPressure: number | null;
  cleanRate: number | null;
  dirtyRate: number | null;
  jobRate: number | null;
  offsetWellPressure: number | null;
}

export interface StageExecution {
  stageExecutionId: string;
  pad: string;
  setId: SetNumber;
  spreadIdentifier: string;
  crewName: string;
  well: string;
  stage: number;
  capturedBy: string;
  exportedBy: string;
  targetMinutes: number;
  status: 'active' | 'closed';
  startedAt: string;
  closedAt: string | null;
}

export interface FailureCase {
  caseId: string;
  stageExecutionId: string;
  affectedPumpId: string;
  replacementPumpId: string | null;
  firstDetectedAt: string;
  detectionSource: string;
  failureArea: string;
  failureReason: string;
  failureEvidence: string;
  diagnosisStatus: string;
  responsibleGroup: string;
  conditionClass: string;
  partOfPlan: 'Yes' | 'No';
  sttOrder: number | null;
  sttReadiness: string;
  plannedAction: string;
  minutesToRecovery: number | null;
  taskDescription: string;
  deferredReason: string;
  workStatus: string;
  workStartAt: string | null;
  workEndAt: string | null;
  actualMinutes: number | null;
  actualAction: string;
  confirmedFailureReason: string;
  resolutionOutcome: string;
  returnToServiceAt: string | null;
  comments: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  acknowledgedAt: string | null;
  ruleId: string | null;
  ruleStatus: CaseRuleStatus;
  technicalValidationConfirmedAt: string | null;
}

export interface PumpStageLogRow {
  RecordId: string;
  CaptureId: string;
  StageExecutionId: string;
  CaptureTimestamp: string;
  CapturedBy: string;
  CaseId: string;
  Pad: string;
  SetId: number;
  SpreadIdentifier: string;
  CrewName: string;
  Well: string;
  Stage: number;
  PumpId: string;
  PumpType: string;
  Manifold: string;
  ManifoldType: string;
  Position: string;
  PumpDistance: number | null;
  ActuatorNumber: string;
  DGB_Bifuel: string;
  CurrentStatus: string;
  ConditionClass: string;
  DetectionSource: string;
  FailureDetectedAt: string;
  FailureArea: string;
  FailureReason: string;
  FailureEvidence: string;
  DiagnosisStatus: string;
  ResponsibleGroup: string;
  PartOfPlan: string;
  STTOrder: number | null;
  STTReadiness: string;
  PlannedAction: string;
  ReplacementPumpId: string;
  MinutesToRecovery: number | null;
  TaskDescription: string;
  DeferredReason: string;
  WorkStatus: string;
  WorkStartAt: string;
  WorkEndAt: string;
  ActualMinutes: number | null;
  ActualAction: string;
  ConfirmedFailureReason: string;
  ResolutionOutcome: string;
  ReturnToServiceAt: string;
  Comments: string;
  PumpRate: number | null;
  PumpPressure: number | null;
  CleanRate: number | null;
  DirtyRate: number | null;
  JobRate: number | null;
  OffsetWellPressure: number | null;
}

export interface OperationalCapture {
  captureId: string;
  stageExecutionId: string;
  captureTimestamp: string;
  capturedBy: string;
  moment: CaptureMoment;
  rows: PumpStageLogRow[];
}

export interface PrimeMaintenanceState {
  schemaVersion: typeof APP_STORAGE_SCHEMA_VERSION;
  stage: StageExecution;
  manifolds: Manifold[];
  pumps: Pump[];
  slotActuators: Record<string, string>;
  failureCases: FailureCase[];
  captures: OperationalCapture[];
  caseSequenceByPump: Record<string, number>;
  captureSequence: number;
}

export interface SlotTarget {
  manifoldId: string;
  position: number;
  side: Exclude<PumpSide, 'bench'>;
}

export interface FailureCaseInput {
  affectedPumpId: string;
  detectionSource: string;
  failureArea: string;
  failureReason: string;
  failureEvidence: string;
  diagnosisStatus: string;
  responsibleGroup: string;
  conditionClass: string;
  plannedAction: string;
  minutesToRecovery: number | null;
  taskDescription: string;
  ruleId: string | null;
  ruleStatus: CaseRuleStatus;
}

export type CaseValidationErrors = Partial<Record<keyof FailureCase, string>>;
