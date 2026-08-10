import {
  LayoutsBySet,
  MaintenanceState,
  Manifold,
  Pump,
  SetLayout,
  SetNumber,
  SET_NUMBERS,
} from '../models/maintenance.models';

function createDefaultManifolds(setNumber: SetNumber): Manifold[] {
  return [
    {
      id: `set-${setNumber}-manifold-clean-1`,
      label: 'Manifold limpio 1',
      type: 'clean',
    },
    {
      id: `set-${setNumber}-manifold-dirty-1`,
      label: 'Manifold sucio 1',
      type: 'dirty',
    },
  ];
}

function withWorkflowDefaults(
  pump: Omit<Pump, 'movement' | 'movementComment' | 'reservedForEventId'>,
): Pump {
  return {
    ...pump,
    movement: null,
    movementComment: '',
    reservedForEventId: null,
  };
}

function createDefaultPumps(setNumber: SetNumber): Pump[] {
  const cleanManifoldId = `set-${setNumber}-manifold-clean-1`;
  const dirtyManifoldId = `set-${setNumber}-manifold-dirty-1`;

  return [
    withWorkflowDefaults({
      id: `set-${setNumber}-pump-301`,
      sap: 'SAP-301',
      side: 'left',
      manifoldId: cleanManifoldId,
      position: 1,
      connection: 'clean',
      status: 'operative',
      offlineReason: null,
    }),
    withWorkflowDefaults({
      id: `set-${setNumber}-pump-302`,
      sap: 'SAP-302',
      side: 'right',
      manifoldId: cleanManifoldId,
      position: 2,
      connection: 'clean',
      status: 'operative',
      offlineReason: null,
    }),
    withWorkflowDefaults({
      id: `set-${setNumber}-pump-401`,
      sap: 'SAP-401',
      side: 'left',
      manifoldId: dirtyManifoldId,
      position: 3,
      connection: 'dirty',
      status: 'operative',
      offlineReason: null,
    }),
    withWorkflowDefaults({
      id: `set-${setNumber}-pump-402`,
      sap: 'SAP-402',
      side: 'right',
      manifoldId: dirtyManifoldId,
      position: 4,
      connection: 'dirty',
      status: 'operative',
      offlineReason: null,
    }),
    withWorkflowDefaults({
      id: `set-${setNumber}-pump-901`,
      sap: 'SAP-901',
      side: 'reserve',
      manifoldId: null,
      position: 1,
      connection: 'none',
      status: 'operative',
      offlineReason: null,
    }),
  ];
}

export function createDefaultLayout(setNumber: SetNumber): SetLayout {
  return {
    setNumber,
    manifolds: createDefaultManifolds(setNumber),
    pumps: createDefaultPumps(setNumber),
  };
}

export function createDefaultLayouts(): LayoutsBySet {
  return Object.fromEntries(
    SET_NUMBERS.map((setNumber) => [setNumber, createDefaultLayout(setNumber)]),
  ) as LayoutsBySet;
}

export function createDefaultState(): MaintenanceState {
  return {
    schemaVersion: 2,
    selectedSet: 5,
    stageContext: {
      pad: 'LAJE-18',
      well: '72',
      stage: '10',
    },
    layouts: createDefaultLayouts(),
    operationalEvents: [],
    maintenanceTasks: [],
  };
}
