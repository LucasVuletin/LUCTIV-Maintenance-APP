import type { PumpDynamicStatus, PumpModel } from './prime.models';

export type PumpStatus = PumpDynamicStatus;
export type PumpDataView = 'operation' | 'hours';

export interface PumpPosition {
  readonly slotId: string;
  readonly operationalId: string | null;
  readonly pumpNumber: string | null;
  readonly rateBpm: number | null;
  readonly gear: string | null;
  readonly rpm: number | null;
  readonly connectorLabel: string;
  readonly status: PumpStatus;
  readonly isDgb: boolean;
  readonly dgbSubstitutionPercentage: number;
  readonly supervisorComment: string;
  readonly pumpModel: PumpModel;
  readonly signalColumnCount: 3 | 5;
  readonly hoursP: number;
  readonly hoursD: number;
  readonly hoursS: number;
}

export interface PumpSpreadSide {
  readonly id: 'A' | 'B';
  readonly label: string;
  readonly totalRateBpm: number;
  readonly pumps: readonly PumpPosition[];
}

export interface PumpSpreadLayout {
  readonly manifoldId: string;
  readonly manifoldLabel: string;
  readonly manifoldType: 'clean' | 'dirty';
  readonly left: PumpSpreadSide;
  readonly right: PumpSpreadSide;
}

export interface PumpSpreadDropEvent {
  readonly slotId: string;
  readonly pumpNumber: string;
}

export interface PumpConnectorChangeEvent {
  readonly slotId: string;
  readonly connectorLabel: string;
}

export interface PumpStatusChangeEvent {
  readonly pumpNumber: string;
  readonly status: PumpStatus;
}

export interface PumpCommentChangeEvent {
  readonly pumpNumber: string;
  readonly comment: string;
}
