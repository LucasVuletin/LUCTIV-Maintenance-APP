import { MaintenanceState, Manifold, Pump } from '../models/maintenance.models';

const manifolds: Manifold[] = [
  { id: 'manifold-clean-1', label: 'Manifold limpio 1', type: 'clean' },
  { id: 'manifold-dirty-1', label: 'Manifold sucio 1', type: 'dirty' },
];

const pumps: Pump[] = [
  {
    id: 'pump-301',
    sap: 'SAP-301',
    side: 'left',
    manifoldId: 'manifold-clean-1',
    position: 1,
    connection: 'clean',
    status: 'operative',
    offlineReason: null,
  },
  {
    id: 'pump-302',
    sap: 'SAP-302',
    side: 'right',
    manifoldId: 'manifold-clean-1',
    position: 2,
    connection: 'clean',
    status: 'operative',
    offlineReason: null,
  },
  {
    id: 'pump-401',
    sap: 'SAP-401',
    side: 'left',
    manifoldId: 'manifold-dirty-1',
    position: 3,
    connection: 'dirty',
    status: 'operative',
    offlineReason: null,
  },
  {
    id: 'pump-402',
    sap: 'SAP-402',
    side: 'right',
    manifoldId: 'manifold-dirty-1',
    position: 4,
    connection: 'dirty',
    status: 'operative',
    offlineReason: null,
  },
  {
    id: 'pump-901',
    sap: 'SAP-901',
    side: 'reserve',
    manifoldId: null,
    position: 1,
    connection: 'none',
    status: 'operative',
    offlineReason: null,
  },
];

export function createDefaultState(): MaintenanceState {
  return {
    schemaVersion: 1,
    selectedSet: 5,
    stageContext: {
      pad: 'LAJE-18',
      well: '72',
      stage: '10',
    },
    manifolds: structuredClone(manifolds),
    pumps: structuredClone(pumps),
    operationalEvents: [],
    maintenanceTasks: [],
  };
}
