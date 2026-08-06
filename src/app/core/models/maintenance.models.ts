export type SetNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type PumpSide = 'left' | 'right' | 'reserve';
export type PumpConnection = 'clean' | 'dirty' | 'none';
export type PumpStatus = 'operative' | 'offline';
export type MaintenanceDepartment = 'PE' | 'IEM';
export type MaintenanceTaskStatus = 'pending' | 'completed';

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
}

export interface OperationalEvent {
  id: string;
  createdAt: string;
  pumpId: string;
  pumpSap: string;
  department: MaintenanceDepartment;
  line: 'LIMPIO' | 'SUCIO';
  reason: string;
  recommendation: string;
}

export interface MaintenanceTask {
  id: string;
  createdAt: string;
  department: MaintenanceDepartment;
  pumpSap: string;
  action: string;
  status: MaintenanceTaskStatus;
}

export interface MaintenanceState {
  schemaVersion: 1;
  selectedSet: SetNumber;
  stageContext: StageContext;
  manifolds: Manifold[];
  pumps: Pump[];
  operationalEvents: OperationalEvent[];
  maintenanceTasks: MaintenanceTask[];
}
