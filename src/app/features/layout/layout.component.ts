import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Manifold, Pump, SlotTarget } from '../../core/models/prime.models';
import { PumpTelemetrySample } from '../../core/models/telemetry.models';
import { PumpCommentChangeEvent, PumpConnectorChangeEvent, PumpDataView, PumpPosition, PumpSpreadDropEvent, PumpSpreadLayout, PumpStatus, PumpStatusChangeEvent } from '../../core/models/pump-spread.model';
import { PUMP_TELEMETRY_SOURCE } from '../../core/services/pump-telemetry.provider';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { orderPumps, pumpPositionIds } from '../../prime/pump-order';
import { PumpSpreadLayoutComponent } from '../pump-spread/pump-spread-layout.component';
import { AlertsMaintenancePanelComponent } from '../telemetry/alerts-maintenance-panel.component';

type TelemetryYAxis = 'rateBpm' | 'engineLoadPct' | 'engineRpm' | 'dischargePressurePsi';
type TelemetrySortKey = 'position' | 'pumpId' | 'engineLoadPct' | 'engineRpm' | 'dischargePressurePsi' | 'rateBpm' | 'signalStatus';

@Component({
  selector: 'app-layout',
  imports: [FormsModule, DatePipe, PumpSpreadLayoutComponent, AlertsMaintenancePanelComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly telemetry = inject(PUMP_TELEMETRY_SOURCE);
  protected readonly selectedPumpId = signal<string | null>(null);
  protected readonly isPumpDetailsOpen = signal(false);
  protected readonly dataView = signal<PumpDataView>('operation');
  protected readonly targetSlotId = signal<string | null>(null);
  protected readonly isSlotAddOpen = signal(false);
  protected readonly pumpFormError = signal('');
  protected slotPumpNumber = '';
  protected readonly positionIds = computed(() => pumpPositionIds(this.store.state().pumps, this.store.state().manifolds));
  protected readonly telemetryIdentityJson = computed(() => JSON.stringify(this.store.state().pumps.map((pump) => ({ unitId: pump.sap, pumpId: this.positionIds()[pump.sap] ?? '—' }))));
  protected readonly telemetrySortKey = signal<TelemetrySortKey>('position');
  protected readonly telemetrySortDirection = signal<1 | -1>(1);
  protected readonly telemetryYAxis = signal<TelemetryYAxis>('rateBpm');
  protected readonly telemetryPumps = computed(() => orderPumps(this.store.state().pumps, this.store.state().manifolds));
  protected readonly sortedTelemetryPumps = computed(() => {
    const key = this.telemetrySortKey();
    const direction = this.telemetrySortDirection();
    const latest = this.telemetry.latest();
    return [...this.telemetryPumps()].sort((left, right) => {
      const leftSample = latest[left.sap];
      const rightSample = latest[right.sap];
      const leftValue = this.telemetrySortValue(left, leftSample, key);
      const rightValue = this.telemetrySortValue(right, rightSample, key);
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));
      return comparison * direction;
    });
  });
  protected readonly telemetryChartMax = computed(() => {
    const history = this.telemetry.history();
    return Math.max(1, ...this.telemetryPumps().flatMap((pump) => (history[pump.sap] ?? []).map((sample) => sample[this.telemetryYAxis()])));
  });
  protected readonly telemetrySeries = computed(() => this.telemetryPumps().map((pump, index) => {
    const samples = this.telemetry.history()[pump.sap] ?? [];
    return { pumpId: pump.sap, color: `hsl(${(index * 47) % 360} 72% 62%)`, points: samples.map((sample, sampleIndex) => `${(samples.length <= 1 ? 0 : sampleIndex / (samples.length - 1) * 580).toFixed(1)},${(142 - sample[this.telemetryYAxis()] / this.telemetryChartMax() * 132).toFixed(1)}`).join(' ') };
  }));
  protected readonly spreadLayouts = computed<readonly PumpSpreadLayout[]>(() =>
    this.store.state().manifolds.map((manifold) => this.toSpreadLayout(manifold)),
  );
  protected readonly benchPumps = computed(() =>
    this.store.state().pumps.filter((pump) => pump.side === 'bench').sort((left, right) => left.position - right.position),
  );
  protected readonly selectedPump = computed(() => {
    const pumpId = this.selectedPumpId();
    return pumpId ? this.store.pumpBySap(pumpId) : null;
  });
  protected readonly selectedCase = computed(() => {
    const pump = this.selectedPump();
    return pump ? this.store.openCases().find((entry) => entry.affectedPumpId === pump.sap || entry.replacementPumpId === pump.sap) ?? null : null;
  });

  constructor() {
    effect(() => this.telemetry.syncPumps(this.store.state().pumps));
  }

  protected openPumpDetails(position: PumpPosition): void {
    this.openPumpById(position.pumpNumber);
  }

  protected openPumpById(pumpId: string | null): void {
    this.selectedPumpId.set(pumpId);
    this.isPumpDetailsOpen.set(Boolean(pumpId));
  }

  protected selectPump(pumpId: string): void {
    this.selectedPumpId.set(pumpId);
  }

  protected closePumpDetails(): void {
    this.isPumpDetailsOpen.set(false);
  }

  protected movePump(event: PumpSpreadDropEvent): void {
    const pump = this.store.pumpBySap(event.pumpNumber);
    const target = this.parseSlotId(event.slotId);
    if (pump && target) this.store.placePump(pump.id, target);
  }

  protected updateConnector(event: PumpConnectorChangeEvent): void {
    const target = this.parseSlotId(event.slotId);
    if (target) this.store.setActuator(target, event.connectorLabel);
  }

  protected updatePumpStatus(event: PumpStatusChangeEvent): void {
    const pump = this.store.pumpBySap(event.pumpNumber);
    if (pump) this.store.updatePumpStatus(pump.id, event.status);
  }

  protected updatePumpComment(event: PumpCommentChangeEvent): void {
    const pump = this.store.pumpBySap(event.pumpNumber);
    if (pump) this.store.updatePumpComment(pump.id, event.comment);
  }

  protected openSlotAdd(slotId: string): void {
    this.targetSlotId.set(slotId);
    this.slotPumpNumber = '';
    this.pumpFormError.set('');
    this.isSlotAddOpen.set(true);
  }

  protected addPumpAtSlot(): void {
    const slotId = this.targetSlotId();
    const target = slotId ? this.parseSlotId(slotId) : null;
    if (!target) return;
    const error = this.store.addPump(this.slotPumpNumber);
    this.pumpFormError.set(error ?? '');
    if (error) return;
    const pump = this.store.pumpBySap(this.slotPumpNumber);
    if (pump) this.store.placePump(pump.id, target);
    this.isSlotAddOpen.set(false);
  }

  protected updateSelectedPumpStatus(status: PumpStatus): void {
    const pump = this.selectedPump();
    if (pump) this.store.updatePumpStatus(pump.id, status);
  }

  protected updateSelectedPumpModel(pumpModel: Pump['pumpModel']): void {
    const pump = this.selectedPump();
    if (pump) this.store.updatePumpModel(pump.id, pumpModel);
  }

  protected updateSelectedPumpDgb(isDgb: boolean): void {
    const pump = this.selectedPump();
    if (pump) this.store.updatePumpDgb(pump.id, isDgb, pump.dgbSubstitutionPercentage);
  }

  protected updateSelectedPumpDgbPercentage(value: string | number): void {
    const pump = this.selectedPump();
    if (pump) this.store.updatePumpDgb(pump.id, true, Number(value));
  }

  protected removeSelectedPump(): void {
    const pump = this.selectedPump();
    if (!pump || !window.confirm(`¿Quitar la bomba ${pump.sap} del spread?`)) return;
    const error = this.store.removePump(pump.id);
    this.pumpFormError.set(error ?? '');
    if (!error) this.closePumpDetails();
  }

  protected beginBenchDrag(pump: Pump, event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', pump.sap);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected dropOnBench(event: DragEvent): void {
    event.preventDefault();
    const pumpNumber = event.dataTransfer?.getData('text/plain');
    const pump = pumpNumber ? this.store.pumpBySap(pumpNumber) : null;
    if (pump) this.store.movePumpToBench(pump.id);
  }

  protected statusForPump(pump: Pump): PumpStatus {
    const failureCase = this.store.openCases().find((entry) => entry.affectedPumpId === pump.sap || entry.replacementPumpId === pump.sap);
    if (failureCase?.workStatus === 'In progress') return 'maintenance';
    return pump.dynamicStatus;
  }

  protected statusLabel(status: PumpStatus): string {
    const labels: Record<PumpStatus, string> = {
      running: 'EN MARCHA',
      available: 'DISPONIBLE',
      warning: 'ALERTA',
      down: 'FUERA DE SERVICIO',
      maintenance: 'MTTO',
      offline: 'OFFLINE',
    };
    return labels[status];
  }

  protected moveSelectedToBench(): void {
    const pump = this.selectedPump();
    if (!pump) return;
    this.store.movePumpToBench(pump.id);
    this.closePumpDetails();
  }

  protected decideSelectedCase(decision: 'include' | 'backlog'): void {
    const failureCase = this.selectedCase();
    if (failureCase) this.store.decideCase(failureCase.caseId, decision);
  }

  private toSpreadLayout(manifold: Manifold): PumpSpreadLayout {
    const positions = Array.from({ length: manifold.pumpsPerSide }, (_, index) => index + 1);
    const side = (pumpSide: 'left' | 'right', id: 'A' | 'B') => {
      const pumps = positions.map((position) => this.toPumpPosition(manifold, pumpSide, position));
      return {
        id,
        label: id === 'A' ? 'Lado arena' : 'Lado químicos',
        totalRateBpm: pumps.reduce((total, pump) => total + (pump.rateBpm ?? 0), 0),
        pumps,
      } as const;
    };
    return {
      manifoldId: manifold.id,
      manifoldLabel: manifold.type === 'clean' ? 'LIMPIO' : 'SUCIO',
      manifoldType: manifold.type,
      left: side('left', 'A'),
      right: side('right', 'B'),
    };
  }

  private toPumpPosition(manifold: Manifold, side: 'left' | 'right', position: number): PumpPosition {
    const target: SlotTarget = { manifoldId: manifold.id, side, position };
    const pump = this.store.slotPump(target);
    const sample = pump ? this.telemetry.latest()[pump.sap] : null;
    return {
      slotId: `${manifold.id}:${side}:${position}`,
      operationalId: pump ? this.positionIds()[pump.sap] ?? null : null,
      pumpNumber: pump?.sap ?? null,
      rateBpm: sample?.rateBpm ?? pump?.pumpRate ?? null,
      gear: sample ? this.gearFor(sample) : null,
      rpm: sample?.engineRpm ?? null,
      connectorLabel: this.store.state().slotActuators[`${manifold.id}:${side}:${position}`] ?? String(position).padStart(2, '0'),
      status: pump ? this.statusForPump(pump) : 'offline',
      isDgb: pump?.isDgb ?? false,
      dgbSubstitutionPercentage: pump?.dgbSubstitutionPercentage ?? 0,
      supervisorComment: pump?.supervisorComment ?? '',
      pumpModel: pump?.pumpModel ?? 'HT200',
      signalColumnCount: pump?.pumpModel === 'Q10' ? 5 : 3,
      hoursP: pump?.signals.p ?? 0,
      hoursD: pump?.signals.d ?? 0,
      hoursS: pump?.signals.s ?? 0,
    };
  }

  protected telemetrySample(pumpId: string): PumpTelemetrySample | null {
    return this.telemetry.latest()[pumpId] ?? null;
  }

  protected telemetryState(sample: PumpTelemetrySample | null): string {
    if (!sample) return 'Sin señal';
    return { pumping: 'Bombeando', standby: 'Backup', warning: 'Alerta', offline: 'Caída', 'no-communication': 'Sin comunicación' }[sample.signalStatus];
  }

  protected gearFor(sample: PumpTelemetrySample): '1L' | '2L' | '3L' | '4L' {
    if (sample.rateBpm >= 5 && sample.dischargePressurePsi < 10500) return '4L';
    if (sample.rateBpm >= 4 || sample.dischargePressurePsi < 11500) return '3L';
    if (sample.rateBpm >= 2.5 || sample.dischargePressurePsi < 12500) return '2L';
    return '1L';
  }

  protected telemetryStateClass(sample: PumpTelemetrySample | null): string {
    return sample?.signalStatus ?? 'no-communication';
  }

  private telemetrySortValue(pump: Pump, sample: PumpTelemetrySample | undefined, key: TelemetrySortKey): string | number {
    if (key === 'position') return Number(this.positionIds()[pump.sap]?.slice(1) ?? 999);
    if (key === 'pumpId') return pump.sap;
    if (key === 'signalStatus') return sample?.signalStatus ?? '';
    return sample?.[key] ?? -1;
  }

  protected sortTelemetry(key: TelemetrySortKey): void {
    if (this.telemetrySortKey() === key) this.telemetrySortDirection.update((direction) => direction === 1 ? -1 : 1);
    else { this.telemetrySortKey.set(key); this.telemetrySortDirection.set(1); }
  }

  protected telemetrySortMarker(key: TelemetrySortKey): string {
    return this.telemetrySortKey() === key ? this.telemetrySortDirection() === 1 ? '↑' : '↓' : '';
  }

  private parseSlotId(slotId: string): SlotTarget | null {
    const [manifoldId, side, rawPosition] = slotId.split(':');
    const position = Number(rawPosition);
    if (!manifoldId || (side !== 'left' && side !== 'right') || !Number.isInteger(position)) return null;
    return { manifoldId, side, position };
  }
}
