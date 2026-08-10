import { createDefaultState } from './default-layout';
import { validateMaintenanceState } from '../domain/state-invariants';
import {
  MaintenanceState,
  MaintenanceTask,
  Manifold,
  OperationalEvent,
  Pump,
  SetNumber,
  SET_NUMBERS,
  StageContext,
} from '../models/maintenance.models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSetNumber(value: unknown): value is SetNumber {
  return SET_NUMBERS.includes(value as SetNumber);
}

function readStageContext(value: unknown): StageContext | null {
  if (!isRecord(value)) {
    return null;
  }

  const { pad, well, stage } = value;
  return typeof pad === 'string' && typeof well === 'string' && typeof stage === 'string'
    ? { pad, well, stage }
    : null;
}

function readLegacyManifold(value: unknown): Manifold | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, label, type } = value;
  if (
    typeof id !== 'string' ||
    typeof label !== 'string' ||
    (type !== 'clean' && type !== 'dirty')
  ) {
    return null;
  }

  return { id, label, type };
}

function readLegacyPump(value: unknown): Pump | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, sap, side, manifoldId, position, connection, status, offlineReason } = value;
  if (
    typeof id !== 'string' ||
    typeof sap !== 'string' ||
    (side !== 'left' && side !== 'right' && side !== 'reserve') ||
    (typeof manifoldId !== 'string' && manifoldId !== null) ||
    !Number.isInteger(position) ||
    (connection !== 'clean' && connection !== 'dirty' && connection !== 'none') ||
    (status !== 'operative' && status !== 'offline') ||
    (typeof offlineReason !== 'string' && offlineReason !== null)
  ) {
    return null;
  }

  return {
    id,
    sap,
    side,
    manifoldId: manifoldId as string | null,
    position: position as number,
    connection,
    status,
    offlineReason: offlineReason as string | null,
    movement: status === 'offline' ? 'maintenance' : null,
    movementComment: status === 'offline' ? ((offlineReason as string | null) ?? '') : '',
    reservedForEventId: null,
  };
}

function migrateVersionOne(value: Record<string, unknown>): MaintenanceState | null {
  const selectedSet = isSetNumber(value['selectedSet']) ? value['selectedSet'] : 5;
  const stageContext = readStageContext(value['stageContext']);
  const rawManifolds = value['manifolds'];
  const rawPumps = value['pumps'];

  if (!stageContext || !Array.isArray(rawManifolds) || !Array.isArray(rawPumps)) {
    return null;
  }

  const manifolds = rawManifolds.map(readLegacyManifold);
  const pumps = rawPumps.map(readLegacyPump);
  if (manifolds.some((entry) => entry === null) || pumps.some((entry) => entry === null)) {
    return null;
  }

  const nextState = createDefaultState();
  nextState.selectedSet = selectedSet;
  nextState.stageContext = stageContext;
  nextState.layouts[selectedSet] = {
    setNumber: selectedSet,
    manifolds: manifolds as Manifold[],
    pumps: pumps as Pump[],
  };

  const rawEvents = Array.isArray(value['operationalEvents']) ? value['operationalEvents'] : [];
  nextState.operationalEvents = rawEvents.flatMap((entry): OperationalEvent[] => {
    if (!isRecord(entry)) {
      return [];
    }

    const pump = nextState.layouts[selectedSet].pumps.find(
      (candidate) => candidate.id === entry['pumpId'],
    );
    const manifold = nextState.layouts[selectedSet].manifolds.find(
      (candidate) => candidate.id === pump?.manifoldId,
    );
    if (
      !pump ||
      pump.side === 'reserve' ||
      !manifold ||
      typeof entry['id'] !== 'string' ||
      typeof entry['createdAt'] !== 'string' ||
      typeof entry['reason'] !== 'string' ||
      typeof entry['recommendation'] !== 'string'
    ) {
      return [];
    }

    return [
      {
        id: entry['id'],
        createdAt: entry['createdAt'],
        respondedAt: null,
        restoredAt: null,
        setNumber: selectedSet,
        stageContext: { ...stageContext },
        pumpId: pump.id,
        pumpSap: pump.sap,
        department: entry['department'] === 'IEM' ? 'IEM' : 'PE',
        line: pump.connection === 'dirty' ? 'SUCIO' : 'LIMPIO',
        manifoldId: manifold.id,
        manifoldLabel: manifold.label,
        side: pump.side,
        position: pump.position,
        connection: pump.connection === 'dirty' ? 'dirty' : 'clean',
        reason: entry['reason'],
        recommendation: entry['recommendation'],
        recommendedReplacementPumpId: null,
        recommendedReplacementPumpSap: null,
        replacementPumpId: null,
        replacementPumpSap: null,
        decision: 'pending',
        responseComment: '',
      },
    ];
  });

  const rawTasks = Array.isArray(value['maintenanceTasks']) ? value['maintenanceTasks'] : [];
  nextState.maintenanceTasks = rawTasks.flatMap((entry): MaintenanceTask[] => {
    if (
      !isRecord(entry) ||
      typeof entry['id'] !== 'string' ||
      typeof entry['createdAt'] !== 'string' ||
      typeof entry['pumpSap'] !== 'string' ||
      typeof entry['action'] !== 'string'
    ) {
      return [];
    }

    const pump = nextState.layouts[selectedSet].pumps.find(
      (candidate) => candidate.sap === entry['pumpSap'],
    );
    if (!pump) {
      return [];
    }

    const event = nextState.operationalEvents.find(
      (candidate) => candidate.pumpSap === pump.sap && candidate.createdAt === entry['createdAt'],
    );
    return [
      {
        id: entry['id'],
        eventId: event?.id ?? null,
        createdAt: entry['createdAt'],
        completedAt: entry['status'] === 'completed' ? entry['createdAt'] : null,
        setNumber: selectedSet,
        stageContext: { ...stageContext },
        department: entry['department'] === 'IEM' ? 'IEM' : 'PE',
        pumpId: pump.id,
        pumpSap: pump.sap,
        action: entry['action'],
        status: entry['status'] === 'completed' ? 'completed' : 'pending',
      },
    ];
  });

  return validateMaintenanceState(nextState) === null ? nextState : null;
}

export function parseMaintenanceState(value: unknown): MaintenanceState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value['schemaVersion'] === 1) {
    return migrateVersionOne(value);
  }

  if (value['schemaVersion'] !== 2) {
    return null;
  }

  try {
    const candidate = structuredClone(value) as unknown as MaintenanceState;
    return validateMaintenanceState(candidate) === null ? candidate : null;
  } catch {
    return null;
  }
}
