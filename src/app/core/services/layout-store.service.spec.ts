import { TestBed } from '@angular/core/testing';

import { MAINTENANCE_STORAGE } from './maintenance-persistence.service';
import { LayoutStore } from './layout-store.service';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LayoutStore correlated workflow', () => {
  let store: LayoutStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LayoutStore, { provide: MAINTENANCE_STORAGE, useValue: new MemoryStorage() }],
    });
    store = TestBed.inject(LayoutStore);
  });

  it('keeps each SET layout and history independent', () => {
    const setFivePump = store
      .currentPumps()
      .find((pump) => pump.side !== 'reserve' && pump.connection === 'dirty');
    expect(setFivePump).toBeTruthy();

    store.markPumpOffline(setFivePump!.id, 'Falla de prueba');
    expect(store.offlineCount()).toBe(1);
    expect(store.currentEvents()).toHaveLength(1);

    store.setSelectedSet(4);
    expect(store.offlineCount()).toBe(0);
    expect(store.currentEvents()).toHaveLength(0);

    store.setSelectedSet(5);
    expect(store.offlineCount()).toBe(1);
    expect(store.currentEvents()).toHaveLength(1);
  });

  it('reserves one replacement and snapshots the operational context', () => {
    store.updateStageContext({ pad: 'PAD-A', well: '12', stage: '7' });
    const affectedPump = store
      .currentPumps()
      .find((pump) => pump.side !== 'reserve' && pump.connection === 'dirty')!;

    const result = store.markPumpOffline(affectedPump.id, 'Cavitación');
    const event = store.pendingEvents()[0];
    const replacement = store
      .currentPumps()
      .find((pump) => pump.id === event.recommendedReplacementPumpId);

    expect(result.ok).toBe(true);
    expect(event.stageContext).toEqual({ pad: 'PAD-A', well: '12', stage: '7' });
    expect(event.setNumber).toBe(5);
    expect(event.pumpId).toBe(affectedPump.id);
    expect(replacement?.reservedForEventId).toBe(event.id);
    expect(store.availableReserveCount()).toBe(0);
    expect(store.operativeCount()).toBe(3);
    expect(store.offlineCount()).toBe(1);
  });

  it('executes a replacement atomically and links the maintenance task', () => {
    const affectedPump = store
      .currentPumps()
      .find((pump) => pump.side !== 'reserve' && pump.connection === 'dirty')!;
    const originalLocation = {
      side: affectedPump.side,
      manifoldId: affectedPump.manifoldId,
      position: affectedPump.position,
      connection: affectedPump.connection,
    };
    store.markPumpOffline(affectedPump.id, 'DPM');
    const event = store.pendingEvents()[0];

    const result = store.resolveOperationalEvent(
      event.id,
      'replaced',
      event.recommendedReplacementPumpId,
      'Cambio confirmado en campo',
    );
    const layout = store.currentLayout();
    const removedPump = layout.pumps.find((pump) => pump.id === affectedPump.id)!;
    const replacement = layout.pumps.find(
      (pump) => pump.id === event.recommendedReplacementPumpId,
    )!;
    const resolvedEvent = store.currentEvents()[0];
    const task = store.currentTasks()[0];

    expect(result.ok).toBe(true);
    expect(removedPump.side).toBe('reserve');
    expect(removedPump.status).toBe('offline');
    expect(replacement.side).toBe(originalLocation.side);
    expect(replacement.manifoldId).toBe(originalLocation.manifoldId);
    expect(replacement.position).toBe(originalLocation.position);
    expect(replacement.connection).toBe(originalLocation.connection);
    expect(replacement.reservedForEventId).toBeNull();
    expect(resolvedEvent.decision).toBe('replaced');
    expect(resolvedEvent.replacementPumpId).toBe(replacement.id);
    expect(task.eventId).toBe(resolvedEvent.id);
    expect(task.pumpId).toBe(removedPump.id);
    expect(store.operativeCount()).toBe(4);
    expect(store.offlineCount()).toBe(0);
  });

  it('completes MTTO, restores the removed pump and timestamps every record', () => {
    const affectedPump = store
      .currentPumps()
      .find((pump) => pump.side !== 'reserve' && pump.connection === 'dirty')!;
    store.markPumpOffline(affectedPump.id, 'Empaque');
    const event = store.pendingEvents()[0];
    store.resolveOperationalEvent(event.id, 'replaced', event.recommendedReplacementPumpId, '');
    const task = store.currentTasks()[0];

    const result = store.completeTask(task.id);
    const restoredPump = store.currentPumps().find((pump) => pump.id === affectedPump.id)!;
    const completedTask = store.currentTasks()[0];
    const restoredEvent = store.currentEvents()[0];

    expect(result.ok).toBe(true);
    expect(restoredPump.side).toBe('reserve');
    expect(restoredPump.status).toBe('operative');
    expect(restoredPump.offlineReason).toBeNull();
    expect(completedTask.status).toBe('completed');
    expect(completedTask.completedAt).toBeTruthy();
    expect(restoredEvent.restoredAt).toBe(completedTask.completedAt);
    expect(store.availableReserveCount()).toBe(1);
  });

  it('requires a reason when a replacement cannot be performed and releases the reserve', () => {
    const affectedPump = store
      .currentPumps()
      .find((pump) => pump.side !== 'reserve' && pump.connection === 'dirty')!;
    store.markPumpOffline(affectedPump.id, 'Sin señal');
    const event = store.pendingEvents()[0];

    const rejected = store.resolveOperationalEvent(event.id, 'not-possible', null, '');
    expect(rejected.ok).toBe(false);
    expect(store.pendingEvents()).toHaveLength(1);
    expect(store.availableReserveCount()).toBe(0);

    const resolved = store.resolveOperationalEvent(
      event.id,
      'not-possible',
      null,
      'La unidad de reserva no está habilitada por Operaciones',
    );
    expect(resolved.ok).toBe(true);
    expect(store.pendingEvents()).toHaveLength(0);
    expect(store.availableReserveCount()).toBe(1);
    expect(store.currentTasks()[0].eventId).toBe(event.id);
    expect(store.offlineCount()).toBe(1);
  });
});
