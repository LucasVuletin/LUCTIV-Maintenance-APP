export type SetNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type PumpSide = 'left' | 'right' | 'reserve';
export type ActivePumpSide = Exclude<PumpSide, 'reserve'>;
export type PumpConnection = 'clean' | 'dirty' | 'none';
export type PumpStatus = 'operative' | 'offline';
export type PumpMovement = 'entering' | 'leaving' | 'maintenance';
export type MaintenanceDepartment = 'PE' | 'IEM';
export type MaintenanceTaskStatus = 'pending' | 'completed';
export type OperationalDecision = 'pending' | 'replaced' | 'not-possible';

export const SET_NUMBERS: SetNumber[] = [1, 2, 3, 4, 5, 6];

export interface StageContext {
  pad: string;
  well: string;
  stage: string;
}

export interface Manifold {
  id: string;
  label: string;
  type: Exclude<PumpConnection, 'none'>;
}

export interface Pump {
  id: string;
  sap: string;
  side: PumpSide;
  manifoldId: string | null;
  position: number;
  connection: PumpConnection;
  status: PumpStatus;
  offlineReason: string | null;
  movement: PumpMovement | null;
  movementComment: string;
  reservedForEventId: string | null;
}

export interface SetLayout {
  setNumber: SetNumber;
  manifolds: Manifold[];
  pumps: Pump[];
}

export interface OperationalEvent {
  id: string;
  createdAt: string;
  respondedAt: string | null;
  restoredAt: string | null;
  setNumber: SetNumber;
  stageContext: StageContext;
  pumpId: string;
  pumpSap: string;
  department: MaintenanceDepartment;
  line: 'LIMPIO' | 'SUCIO';
  manifoldId: string;
  manifoldLabel: string;
  side: ActivePumpSide;
  position: number;
  connection: Exclude<PumpConnection, 'none'>;
  reason: string;
  recommendation: string;
  recommendedReplacementPumpId: string | null;
  recommendedReplacementPumpSap: string | null;
  replacementPumpId: string | null;
  replacementPumpSap: string | null;
  decision: OperationalDecision;
  responseComment: string;
}

export interface MaintenanceTask {
  id: string;
  eventId: string | null;
  createdAt: string;
  completedAt: string | null;
  setNumber: SetNumber;
  stageContext: StageContext;
  department: MaintenanceDepartment;
  pumpId: string;
  pumpSap: string;
  action: string;
  status: MaintenanceTaskStatus;
}

export type LayoutsBySet = Record<SetNumber, SetLayout>;

export interface MaintenanceState {
  schemaVersion: 2;
  selectedSet: SetNumber;
  stageContext: StageContext;
  layouts: LayoutsBySet;
  operationalEvents: OperationalEvent[];
  maintenanceTasks: MaintenanceTask[];
}

export interface DomainActionResult {
  ok: boolean;
  error: string | null;
}
