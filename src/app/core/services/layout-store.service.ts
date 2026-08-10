import { computed, inject, Injectable, signal } from '@angular/core';

import { createDefaultState } from '../data/default-layout';
import { parseMaintenanceState } from '../data/state-migrations';
import { validateMaintenanceState } from '../domain/state-invariants';
import {
  DomainActionResult,
  MaintenanceState,
  MaintenanceTask,
  OperationalDecision,
  OperationalEvent,
  Pump,
  SetLayout,
  SetNumber,
  StageContext,
} from '../models/maintenance.models';
import { MaintenancePersistence } from './maintenance-persistence.service';

function createId(prefix: string): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

function success(): DomainActionResult {
  return { ok: true, error: null };
}

function failure(error: string): DomainActionResult {
  return { ok: false, error };
}

function updateLayout(
  state: MaintenanceState,
  setNumber: SetNumber,
  layout: SetLayout,
): MaintenanceState {
  return {
    ...state,
    layouts: {
      ...state.layouts,
      [setNumber]: layout,
    },
  };
}

function sanitizeFileSegment(value: string, fallback: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return sanitized || fallback;
}

@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly persistence = inject(MaintenancePersistence);
  private readonly writableState = signal(this.readInitialState());

  readonly state = this.writableState.asReadonly();
  readonly actionError = signal<string | null>(null);
  readonly persistenceError = signal<string | null>(null);
  readonly lastSavedAt = signal<string | null>(null);

  readonly currentLayout = computed(() => this.state().layouts[this.state().selectedSet]);
  readonly currentPumps = computed(() => this.currentLayout().pumps);
  readonly currentManifolds = computed(() => this.currentLayout().manifolds);
  readonly currentEvents = computed(() =>
    this.state().operationalEvents.filter((event) => event.setNumber === this.state().selectedSet),
  );
  readonly currentTasks = computed(() =>
    this.state().maintenanceTasks.filter((task) => task.setNumber === this.state().selectedSet),
  );
  readonly pendingEvents = computed(() =>
    this.currentEvents().filter((event) => event.decision === 'pending'),
  );

  readonly operativeCount = computed(
    () =>
      this.currentPumps().filter((pump) => pump.side !== 'reserve' && pump.status === 'operative')
        .length,
  );
  readonly offlineCount = computed(
    () =>
      this.currentPumps().filter((pump) => pump.side !== 'reserve' && pump.status === 'offline')
        .length,
  );
  readonly reserveCount = computed(
    () => this.currentPumps().filter((pump) => pump.side === 'reserve').length,
  );
  readonly availableReserveCount = computed(
    () =>
      this.currentPumps().filter(
        (pump) =>
          pump.side === 'reserve' &&
          pump.status === 'operative' &&
          pump.reservedForEventId === null,
      ).length,
  );

  setSelectedSet(selectedSet: SetNumber): DomainActionResult {
    return this.commit({ ...this.state(), selectedSet });
  }

  updateStageContext(stageContext: StageContext): DomainActionResult {
    const normalizedContext = {
      pad: stageContext.pad.trim(),
      well: stageContext.well.trim(),
      stage: stageContext.stage.trim(),
    };

    if (!normalizedContext.pad || !normalizedContext.well || !normalizedContext.stage) {
      return this.failAction('PAD, pozo y etapa son obligatorios.');
    }

    return this.commit({ ...this.state(), stageContext: normalizedContext });
  }

  markPumpOffline(pumpId: string, reason = 'Falla operativa informada'): DomainActionResult {
    const state = this.state();
    const setNumber = state.selectedSet;
    const layout = state.layouts[setNumber];
    const affectedPump = layout.pumps.find((pump) => pump.id === pumpId);
    const normalizedReason = reason.trim();

    if (!affectedPump || affectedPump.side === 'reserve') {
      return this.failAction('La bomba seleccionada no pertenece al SET activo.');
    }
    if (affectedPump.status === 'offline') {
      return this.failAction(`${affectedPump.sap} ya se encuentra OFFLINE.`);
    }
    if (!normalizedReason) {
      return this.failAction('Indicá el motivo de la caída.');
    }

    const manifold = layout.manifolds.find((entry) => entry.id === affectedPump.manifoldId);
    if (!manifold || affectedPump.connection === 'none') {
      return this.failAction('La bomba no tiene un circuito activo válido.');
    }

    const eventId = createId('event');
    const createdAt = new Date().toISOString();
    const replacementPump = layout.pumps.find(
      (pump) =>
        pump.side === 'reserve' && pump.status === 'operative' && pump.reservedForEventId === null,
    );
    const line = affectedPump.connection === 'clean' ? 'LIMPIO' : 'SUCIO';
    const department = affectedPump.connection === 'dirty' ? 'IEM' : 'PE';
    const recommendation = replacementPump
      ? `Reemplazar ${affectedPump.sap} por ${replacementPump.sap} en ${line}, posición ${affectedPump.position}.`
      : `Retirar ${affectedPump.sap} de ${line}, posición ${affectedPump.position}; no hay una reserva disponible.`;

    const event: OperationalEvent = {
      id: eventId,
      createdAt,
      respondedAt: null,
      restoredAt: null,
      setNumber,
      stageContext: { ...state.stageContext },
      pumpId: affectedPump.id,
      pumpSap: affectedPump.sap,
      department,
      line,
      manifoldId: manifold.id,
      manifoldLabel: manifold.label,
      side: affectedPump.side,
      position: affectedPump.position,
      connection: affectedPump.connection,
      reason: normalizedReason,
      recommendation,
      recommendedReplacementPumpId: replacementPump?.id ?? null,
      recommendedReplacementPumpSap: replacementPump?.sap ?? null,
      replacementPumpId: null,
      replacementPumpSap: null,
      decision: 'pending',
      responseComment: '',
    };

    const nextLayout: SetLayout = {
      ...layout,
      pumps: layout.pumps.map((pump) => {
        if (pump.id === affectedPump.id) {
          return {
            ...pump,
            status: 'offline',
            offlineReason: normalizedReason,
            movement: 'maintenance',
            movementComment: `Caída registrada: ${normalizedReason}`,
          };
        }
        if (pump.id === replacementPump?.id) {
          return { ...pump, reservedForEventId: eventId };
        }
        return pump;
      }),
    };

    return this.commit({
      ...updateLayout(state, setNumber, nextLayout),
      operationalEvents: [event, ...state.operationalEvents],
    });
  }

  resolveOperationalEvent(
    eventId: string,
    decision: Exclude<OperationalDecision, 'pending'>,
    replacementPumpId: string | null,
    comment: string,
  ): DomainActionResult {
    const state = this.state();
    const event = state.operationalEvents.find((entry) => entry.id === eventId);
    const normalizedComment = comment.trim();

    if (!event || event.decision !== 'pending') {
      return this.failAction('La alerta ya fue resuelta o no existe.');
    }
    if (decision === 'not-possible' && !normalizedComment) {
      return this.failAction('Indicá por qué no se puede realizar el reemplazo.');
    }

    const layout = state.layouts[event.setNumber];
    const affectedPump = layout.pumps.find((pump) => pump.id === event.pumpId);
    if (!affectedPump) {
      return this.failAction('La bomba afectada ya no existe en la configuración del SET.');
    }

    const respondedAt = new Date().toISOString();
    let selectedReplacement: Pump | null = null;
    let nextPumps = layout.pumps.map((pump) =>
      pump.reservedForEventId === event.id ? { ...pump, reservedForEventId: null } : pump,
    );

    if (decision === 'replaced') {
      const selectedId = replacementPumpId ?? event.recommendedReplacementPumpId;
      selectedReplacement = layout.pumps.find((pump) => pump.id === selectedId) ?? null;

      if (
        !selectedReplacement ||
        selectedReplacement.side !== 'reserve' ||
        selectedReplacement.status !== 'operative' ||
        (selectedReplacement.reservedForEventId !== null &&
          selectedReplacement.reservedForEventId !== event.id)
      ) {
        return this.failAction('Elegí una bomba de reserva disponible para confirmar.');
      }
      if (affectedPump.side === 'reserve') {
        return this.failAction('La ubicación original de la bomba ya no está disponible.');
      }

      const reservePosition =
        Math.max(
          0,
          ...layout.pumps
            .filter(
              (pump) =>
                pump.side === 'reserve' &&
                pump.id !== selectedReplacement?.id &&
                pump.id !== affectedPump.id,
            )
            .map((pump) => pump.position),
        ) + 1;

      nextPumps = nextPumps.map((pump) => {
        if (pump.id === affectedPump.id) {
          return {
            ...pump,
            side: 'reserve',
            manifoldId: null,
            position: reservePosition,
            connection: 'none',
            movement: 'maintenance',
            movementComment: `Sale del SET ${event.setNumber}: ${event.reason}`,
            reservedForEventId: null,
          };
        }
        if (pump.id === selectedReplacement?.id) {
          return {
            ...pump,
            side: event.side,
            manifoldId: event.manifoldId,
            position: event.position,
            connection: event.connection,
            status: 'operative',
            offlineReason: null,
            movement: 'entering',
            movementComment: `Entra por ${event.pumpSap}; evento ${event.id}.`,
            reservedForEventId: null,
          };
        }
        return pump;
      });
    }

    const resolvedEvent: OperationalEvent = {
      ...event,
      respondedAt,
      decision,
      responseComment:
        normalizedComment || `Reemplazo confirmado con ${selectedReplacement?.sap ?? 'reserva'}.`,
      replacementPumpId: selectedReplacement?.id ?? null,
      replacementPumpSap: selectedReplacement?.sap ?? null,
    };
    const taskAction =
      decision === 'replaced'
        ? `Diagnosticar y reparar ${event.pumpSap}, retirada del SET. Reemplazo ejecutado con ${selectedReplacement?.sap}.`
        : `Resolver indisponibilidad de ${event.pumpSap}. Reemplazo no ejecutado: ${normalizedComment}`;
    const existingTask = state.maintenanceTasks.find((task) => task.eventId === event.id);
    const nextTasks: MaintenanceTask[] = existingTask
      ? state.maintenanceTasks.map((task) =>
          task.id === existingTask.id
            ? { ...task, action: taskAction, status: 'pending', completedAt: null }
            : task,
        )
      : [
          {
            id: createId('task'),
            eventId: event.id,
            createdAt: respondedAt,
            completedAt: null,
            setNumber: event.setNumber,
            stageContext: { ...event.stageContext },
            department: event.department,
            pumpId: event.pumpId,
            pumpSap: event.pumpSap,
            action: taskAction,
            status: 'pending' as const,
          },
          ...state.maintenanceTasks,
        ];

    return this.commit({
      ...updateLayout(state, event.setNumber, { ...layout, pumps: nextPumps }),
      operationalEvents: state.operationalEvents.map((entry) =>
        entry.id === event.id ? resolvedEvent : entry,
      ),
      maintenanceTasks: nextTasks,
    });
  }

  completeTask(taskId: string): DomainActionResult {
    const state = this.state();
    const task = state.maintenanceTasks.find((entry) => entry.id === taskId);
    if (!task || task.status === 'completed') {
      return this.failAction('La tarea ya fue completada o no existe.');
    }

    const completedAt = new Date().toISOString();
    const layout = state.layouts[task.setNumber];
    const nextLayout: SetLayout = {
      ...layout,
      pumps: layout.pumps.map((pump) =>
        pump.id === task.pumpId
          ? {
              ...pump,
              status: 'operative',
              offlineReason: null,
              movement: null,
              movementComment: '',
              reservedForEventId: null,
            }
          : pump,
      ),
    };

    return this.commit({
      ...updateLayout(state, task.setNumber, nextLayout),
      operationalEvents: state.operationalEvents.map((event) =>
        event.id === task.eventId ? { ...event, restoredAt: completedAt } : event,
      ),
      maintenanceTasks: state.maintenanceTasks.map((entry) =>
        entry.id === task.id ? { ...entry, status: 'completed', completedAt } : entry,
      ),
    });
  }

  availableReplacementPumps(event: OperationalEvent): Pump[] {
    return this.state()
      .layouts[event.setNumber].pumps.filter(
        (pump) =>
          pump.side === 'reserve' &&
          pump.status === 'operative' &&
          (pump.reservedForEventId === null || pump.reservedForEventId === event.id),
      )
      .sort((left, right) => left.position - right.position);
  }

  simulateFailure(): DomainActionResult {
    const candidate =
      this.currentPumps().find(
        (pump) =>
          pump.side !== 'reserve' && pump.status === 'operative' && pump.connection === 'dirty',
      ) ??
      this.currentPumps().find((pump) => pump.side !== 'reserve' && pump.status === 'operative');

    return candidate
      ? this.markPumpOffline(candidate.id, 'Falla operativa simulada')
      : this.failAction('No quedan bombas operativas en el SET para simular una caída.');
  }

  reset(): DomainActionResult {
    return this.commit(createDefaultState());
  }

  importSnapshot(serializedState: string): DomainActionResult {
    try {
      const parsedState = parseMaintenanceState(JSON.parse(serializedState) as unknown);
      return parsedState
        ? this.commit(parsedState)
        : this.failAction('El backup no contiene un estado LUCTIV válido.');
    } catch {
      return this.failAction('El archivo seleccionado no contiene JSON válido.');
    }
  }

  exportSnapshot(): DomainActionResult {
    if (typeof document === 'undefined') {
      return this.failAction('La descarga no está disponible en este entorno.');
    }

    const blob = new Blob([JSON.stringify(this.state(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const context = this.state().stageContext;
    anchor.href = url;
    anchor.download = `luctiv-${sanitizeFileSegment(context.pad, 'pad')}-${sanitizeFileSegment(context.well, 'pozo')}-etapa-${sanitizeFileSegment(context.stage, 'sd')}-set-${this.state().selectedSet}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return success();
  }

  private readInitialState(): MaintenanceState {
    return parseMaintenanceState(this.persistence.load()) ?? createDefaultState();
  }

  private commit(nextState: MaintenanceState): DomainActionResult {
    const invariantError = validateMaintenanceState(nextState);
    if (invariantError) {
      return this.failAction(invariantError);
    }

    this.writableState.set(nextState);
    this.actionError.set(null);
    const persistenceError = this.persistence.save(nextState);
    this.persistenceError.set(persistenceError);
    if (!persistenceError) {
      this.lastSavedAt.set(new Date().toISOString());
    }
    return persistenceError ? failure(persistenceError) : success();
  }

  private failAction(error: string): DomainActionResult {
    this.actionError.set(error);
    return failure(error);
  }
}
