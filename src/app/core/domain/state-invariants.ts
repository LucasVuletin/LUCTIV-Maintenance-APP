import { MaintenanceState, SET_NUMBERS, SetNumber } from '../models/maintenance.models';

function isSetNumber(value: unknown): value is SetNumber {
  return SET_NUMBERS.includes(value as SetNumber);
}

function isStageContext(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const context = value as Record<string, unknown>;
  return (
    typeof context['pad'] === 'string' &&
    typeof context['well'] === 'string' &&
    typeof context['stage'] === 'string'
  );
}

export function validateMaintenanceState(state: MaintenanceState): string | null {
  if (state.schemaVersion !== 2 || !isSetNumber(state.selectedSet)) {
    return 'La versión o el SET activo del estado no son válidos.';
  }

  if (!isStageContext(state.stageContext)) {
    return 'El contexto PAD/pozo/etapa no es válido.';
  }

  if (!Array.isArray(state.operationalEvents) || !Array.isArray(state.maintenanceTasks)) {
    return 'Las colecciones de eventos o mantenimiento no son válidas.';
  }

  const eventIds = new Set<string>();
  const pendingEventSets = new Map<string, SetNumber>();

  for (const event of state.operationalEvents) {
    if (
      !event ||
      typeof event.id !== 'string' ||
      !event.id ||
      eventIds.has(event.id) ||
      typeof event.createdAt !== 'string' ||
      (event.respondedAt !== null && typeof event.respondedAt !== 'string') ||
      (event.restoredAt !== null && typeof event.restoredAt !== 'string') ||
      !isSetNumber(event.setNumber) ||
      !isStageContext(event.stageContext) ||
      typeof event.pumpId !== 'string' ||
      typeof event.pumpSap !== 'string' ||
      (event.department !== 'PE' && event.department !== 'IEM') ||
      (event.line !== 'LIMPIO' && event.line !== 'SUCIO') ||
      typeof event.manifoldId !== 'string' ||
      typeof event.manifoldLabel !== 'string' ||
      (event.side !== 'left' && event.side !== 'right') ||
      (event.connection !== 'clean' && event.connection !== 'dirty') ||
      !Number.isInteger(event.position) ||
      event.position < 1 ||
      typeof event.reason !== 'string' ||
      typeof event.recommendation !== 'string' ||
      (event.recommendedReplacementPumpId !== null &&
        typeof event.recommendedReplacementPumpId !== 'string') ||
      (event.recommendedReplacementPumpSap !== null &&
        typeof event.recommendedReplacementPumpSap !== 'string') ||
      (event.replacementPumpId !== null && typeof event.replacementPumpId !== 'string') ||
      (event.replacementPumpSap !== null && typeof event.replacementPumpSap !== 'string') ||
      typeof event.responseComment !== 'string' ||
      !['pending', 'replaced', 'not-possible'].includes(event.decision)
    ) {
      return 'Hay un evento operativo inválido o duplicado.';
    }

    eventIds.add(event.id);
    if (
      (event.decision === 'pending' && event.respondedAt !== null) ||
      (event.decision !== 'pending' && event.respondedAt === null) ||
      (event.decision === 'replaced' &&
        (event.replacementPumpId === null || event.replacementPumpSap === null)) ||
      (event.decision === 'not-possible' &&
        (event.replacementPumpId !== null || event.replacementPumpSap !== null))
    ) {
      return `La decisión del evento ${event.id} no coincide con su trazabilidad.`;
    }

    if (event.decision === 'pending') {
      pendingEventSets.set(event.id, event.setNumber);
    }
  }

  const globalPumpIds = new Set<string>();

  for (const setNumber of SET_NUMBERS) {
    const layout = state.layouts?.[setNumber];
    if (
      !layout ||
      layout.setNumber !== setNumber ||
      !Array.isArray(layout.manifolds) ||
      !Array.isArray(layout.pumps)
    ) {
      return `La configuración del SET ${setNumber} no es válida.`;
    }

    const manifoldIds = new Set<string>();
    for (const manifold of layout.manifolds) {
      if (
        !manifold ||
        typeof manifold.id !== 'string' ||
        !manifold.id ||
        manifoldIds.has(manifold.id) ||
        typeof manifold.label !== 'string' ||
        (manifold.type !== 'clean' && manifold.type !== 'dirty')
      ) {
        return `Hay un manifold inválido o duplicado en el SET ${setNumber}.`;
      }
      manifoldIds.add(manifold.id);
    }

    const occupiedSlots = new Set<string>();
    for (const pump of layout.pumps) {
      if (
        !pump ||
        typeof pump.id !== 'string' ||
        !pump.id ||
        globalPumpIds.has(pump.id) ||
        typeof pump.sap !== 'string' ||
        !pump.sap.trim() ||
        !Number.isInteger(pump.position) ||
        pump.position < 1 ||
        !['left', 'right', 'reserve'].includes(pump.side) ||
        !['clean', 'dirty', 'none'].includes(pump.connection) ||
        !['operative', 'offline'].includes(pump.status) ||
        (pump.offlineReason !== null && typeof pump.offlineReason !== 'string') ||
        (pump.movement !== null &&
          !['entering', 'leaving', 'maintenance'].includes(pump.movement)) ||
        typeof pump.movementComment !== 'string' ||
        (pump.reservedForEventId !== null && typeof pump.reservedForEventId !== 'string')
      ) {
        return `Hay una bomba inválida o duplicada en el SET ${setNumber}.`;
      }

      globalPumpIds.add(pump.id);

      if (
        (pump.status === 'operative' && pump.offlineReason !== null) ||
        (pump.status === 'offline' && !pump.offlineReason?.trim()) ||
        (pump.reservedForEventId !== null && pump.status !== 'operative')
      ) {
        return `El estado operativo de ${pump.sap} es inconsistente.`;
      }

      if (pump.side === 'reserve') {
        if (pump.manifoldId !== null || pump.connection !== 'none') {
          return `La bomba ${pump.sap} está en reserva pero conserva una conexión activa.`;
        }
      } else {
        const manifold = layout.manifolds.find((entry) => entry.id === pump.manifoldId);
        if (!manifold || pump.connection !== manifold.type) {
          return `La bomba ${pump.sap} no coincide con su manifold y circuito.`;
        }

        const slotKey = `${pump.manifoldId}:${pump.side}:${pump.position}`;
        if (occupiedSlots.has(slotKey)) {
          return `El slot ${slotKey} está ocupado por más de una bomba.`;
        }
        occupiedSlots.add(slotKey);
      }

      if (pump.reservedForEventId !== null) {
        if (
          pump.side !== 'reserve' ||
          pendingEventSets.get(pump.reservedForEventId) !== setNumber
        ) {
          return `La reserva ${pump.sap} está asociada a una alerta inválida.`;
        }
      }
    }
  }

  const taskIds = new Set<string>();
  for (const task of state.maintenanceTasks) {
    if (
      !task ||
      typeof task.id !== 'string' ||
      !task.id ||
      taskIds.has(task.id) ||
      !isSetNumber(task.setNumber) ||
      !isStageContext(task.stageContext) ||
      typeof task.createdAt !== 'string' ||
      (task.completedAt !== null && typeof task.completedAt !== 'string') ||
      (task.department !== 'PE' && task.department !== 'IEM') ||
      typeof task.pumpId !== 'string' ||
      typeof task.pumpSap !== 'string' ||
      (task.eventId !== null && !eventIds.has(task.eventId)) ||
      typeof task.action !== 'string' ||
      !['pending', 'completed'].includes(task.status)
    ) {
      return 'Hay una tarea de mantenimiento inválida o duplicada.';
    }

    if (
      (task.status === 'pending' && task.completedAt !== null) ||
      (task.status === 'completed' && task.completedAt === null)
    ) {
      return `El cierre de la tarea ${task.id} no coincide con su estado.`;
    }
    taskIds.add(task.id);
  }

  return null;
}
