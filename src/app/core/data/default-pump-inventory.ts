import { PumpDynamicStatus } from '../models/prime.models';

export interface DefaultPumpInventoryItem {
  readonly sap: string;
  readonly manifoldType: 'dirty' | 'clean' | null;
  readonly side: 'left' | 'right' | 'bench';
  readonly position: number;
  readonly defaultStatus?: PumpDynamicStatus;
}

export const DEFAULT_PUMP_INVENTORY: readonly DefaultPumpInventoryItem[] = [
  { sap: '2268', manifoldType: 'dirty', side: 'left', position: 1 },
  { sap: '6672', manifoldType: 'dirty', side: 'left', position: 2 },
  { sap: '8340', manifoldType: 'dirty', side: 'left', position: 3 },
  { sap: '2230', manifoldType: 'dirty', side: 'left', position: 4 },
  { sap: '1234', manifoldType: 'dirty', side: 'left', position: 5, defaultStatus: 'running' },
  { sap: '6546', manifoldType: 'dirty', side: 'left', position: 6, defaultStatus: 'running' },
  { sap: '0335', manifoldType: 'dirty', side: 'left', position: 7, defaultStatus: 'running' },
  { sap: '7626', manifoldType: 'dirty', side: 'left', position: 8, defaultStatus: 'available' },
  { sap: '5123', manifoldType: 'dirty', side: 'right', position: 1, defaultStatus: 'down' },
  { sap: '3984', manifoldType: 'dirty', side: 'right', position: 2, defaultStatus: 'running' },
  { sap: '6215', manifoldType: 'dirty', side: 'right', position: 3, defaultStatus: 'running' },
  { sap: '4312', manifoldType: 'dirty', side: 'right', position: 4, defaultStatus: 'running' },
  { sap: '6123', manifoldType: 'dirty', side: 'right', position: 5, defaultStatus: 'running' },
  { sap: '4299', manifoldType: 'dirty', side: 'right', position: 6, defaultStatus: 'running' },
  { sap: '4890', manifoldType: 'dirty', side: 'right', position: 7, defaultStatus: 'running' },
  { sap: '7557', manifoldType: 'dirty', side: 'right', position: 8, defaultStatus: 'running' },
  { sap: '8728', manifoldType: 'clean', side: 'left', position: 1, defaultStatus: 'running' },
  { sap: '9757', manifoldType: 'clean', side: 'left', position: 2, defaultStatus: 'running' },
  { sap: '7741', manifoldType: 'clean', side: 'left', position: 3, defaultStatus: 'running' },
  { sap: '9392', manifoldType: 'clean', side: 'left', position: 4, defaultStatus: 'running' },
  { sap: '8740', manifoldType: 'clean', side: 'left', position: 5, defaultStatus: 'running' },
  { sap: '4645', manifoldType: 'clean', side: 'left', position: 6, defaultStatus: 'running' },
  { sap: '1951', manifoldType: 'clean', side: 'left', position: 7 },
  { sap: '5531', manifoldType: 'clean', side: 'left', position: 8, defaultStatus: 'available' },
  { sap: '1080', manifoldType: 'clean', side: 'right', position: 1, defaultStatus: 'running' },
  { sap: '7732', manifoldType: 'clean', side: 'right', position: 2, defaultStatus: 'running' },
  { sap: '0533', manifoldType: 'clean', side: 'right', position: 3, defaultStatus: 'running' },
  { sap: '3206', manifoldType: 'clean', side: 'right', position: 4, defaultStatus: 'running' },
  { sap: '2221', manifoldType: 'clean', side: 'right', position: 5, defaultStatus: 'available' },
  { sap: '3165', manifoldType: 'clean', side: 'right', position: 6, defaultStatus: 'available' },
  { sap: '8413', manifoldType: 'clean', side: 'right', position: 7, defaultStatus: 'available' },
  { sap: '5583', manifoldType: 'clean', side: 'right', position: 8, defaultStatus: 'available' },
  { sap: '9406', manifoldType: null, side: 'bench', position: 1, defaultStatus: 'maintenance' },
  { sap: '5652', manifoldType: null, side: 'bench', position: 2, defaultStatus: 'available' },
  { sap: '8715', manifoldType: null, side: 'bench', position: 3, defaultStatus: 'available' },
  { sap: '4545', manifoldType: null, side: 'bench', position: 4, defaultStatus: 'available' },
  { sap: '8532', manifoldType: null, side: 'bench', position: 5, defaultStatus: 'available' },
  { sap: '2419', manifoldType: null, side: 'bench', position: 6, defaultStatus: 'maintenance' },
  { sap: '7720', manifoldType: null, side: 'bench', position: 7 },
  { sap: '4896', manifoldType: null, side: 'bench', position: 8 },
  { sap: '9800', manifoldType: null, side: 'bench', position: 9 },
];
