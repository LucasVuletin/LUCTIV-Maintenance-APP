import { computed, Injectable, signal } from '@angular/core';

import { createDefaultState } from '../data/default-layout';
import {
  MaintenanceState,
  SetNumber,
  StageContext,
} from '../models/maintenance.models';

const STORAGE_KEY = 'luctiv-maintenance-state-v1';

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function readInitialState(): MaintenanceState {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) {
      return createDefaultState();
    }

    const parsedState = JSON.parse(savedState) as MaintenanceState;
    return parsedState.schemaVersion === 1 ? parsedState : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

@Injectable({ providedIn: 'root' })
export class LayoutStore {
  readonly state = signal<MaintenanceState>(readInitialState());

  readonly operativeCount = computed(
    () => this.state().pumps.filter((pump) => pump.status === 'operative').length,
  );
  readonly offlineCount = computed(
    () => this.state().pumps.filter((pump) => pump.status === 'offline').length,
  );
  readonly reserveCount = computed(
    () => this.state().pumps.filter((pump) => pump.side === 'reserve').length,
  );

  setSelectedSet(selectedSet: SetNumber): void {
    this.update((state) => ({ ...state, selectedSet }));
  }

  updateStageContext(stageContext: StageContext): void {
    this.update((state) => ({ ...state, stageContext }));
  }

  markPumpOffline(pumpId: string, reason = 'Falla operativa simulada'): void {
    const currentState = this.state();
    const affectedPump = currentState.pumps.find((pump) => pump.id === pumpId);

    if (!affectedPump || affectedPump.status === 'offline') {
      return;
    }

    const replacementPump = currentState.pumps.find(
      (pump) => pump.side === 'reserve' && pump.status === 'operative',
    );
    const line = affectedPump.connection === 'clean' ? 'LIMPIO' : 'SUCIO';
    const department = affectedPump.connection === 'dirty' ? 'IEM' : 'PE';
    const eventId = createId('event');
    const createdAt = new Date().toISOString();
    const recommendation = replacementPump
      ? `Reemplazar ${affectedPump.sap} por ${replacementPump.sap} en circuito ${line}.`
      : `Retirar ${affectedPump.sap} del circuito ${line} y preparar una unidad de respaldo.`;

    this.update((state) => ({
      ...state,
      pumps: state.pumps.map((pump) =>
        pump.id === affectedPump.id
          ? { ...pump, status: 'offline', offlineReason: reason }
          : pump,
      ),
      operationalEvents: [
        {
          id: eventId,
          createdAt,
          pumpId: affectedPump.id,
          pumpSap: affectedPump.sap,
          department,
          line,
          reason,
          recommendation,
        },
        ...state.operationalEvents,
      ],
      maintenanceTasks: [
        {
          id: createId('task'),
          createdAt,
          department,
          pumpSap: affectedPump.sap,
          action: recommendation,
          status: 'pending',
        },
        ...state.maintenanceTasks,
      ],
    }));
  }

  restorePump(pumpId: string): void {
    this.update((state) => ({
      ...state,
      pumps: state.pumps.map((pump) =>
        pump.id === pumpId
          ? { ...pump, status: 'operative', offlineReason: null }
          : pump,
      ),
    }));
  }

  simulateFailure(): void {
    const candidate =
      this.state().pumps.find(
        (pump) =>
          pump.side !== 'reserve' &&
          pump.status === 'operative' &&
          pump.connection === 'dirty',
      ) ??
      this.state().pumps.find(
        (pump) => pump.side !== 'reserve' && pump.status === 'operative',
      );

    if (candidate) {
      this.markPumpOffline(candidate.id);
    }
  }

  toggleTask(taskId: string): void {
    this.update((state) => ({
      ...state,
      maintenanceTasks: state.maintenanceTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'pending' ? 'completed' : 'pending',
            }
          : task,
      ),
    }));
  }

  reset(): void {
    const state = createDefaultState();
    this.state.set(state);
    this.persist(state);
  }

  exportSnapshot(): void {
    const blob = new Blob([JSON.stringify(this.state(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const context = this.state().stageContext;
    anchor.href = url;
    anchor.download = `luctiv-${context.pad || 'pad'}-${context.well || 'pozo'}-etapa-${context.stage || 'sd'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private update(updater: (state: MaintenanceState) => MaintenanceState): void {
    const nextState = updater(this.state());
    this.state.set(nextState);
    this.persist(nextState);
  }

  private persist(state: MaintenanceState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
