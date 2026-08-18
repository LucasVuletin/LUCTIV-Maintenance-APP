import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PumpTelemetrySample } from '../../core/models/telemetry.models';
import { PUMP_TELEMETRY_SOURCE } from '../../core/services/pump-telemetry.provider';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { TechnicalI18nService } from '../../core/services/technical-i18n.service';
import { orderPumps, pumpPositionIds } from '../../prime/pump-order';

type TelemetryYAxis = 'rateBpm' | 'engineLoadPct' | 'engineRpm' | 'dischargePressurePsi';
type TelemetryXAxis = 'time' | 'sample';
type TelemetrySortKey = 'position' | 'pumpId' | 'engineLoadPct' | 'engineRpm' | 'dischargePressurePsi' | 'rateBpm' | 'signalStatus';

@Component({ selector: 'app-pump-telemetry-panel', imports: [FormsModule, DatePipe], templateUrl: './pump-telemetry-panel.component.html', styleUrl: './pump-telemetry-panel.component.scss' })
export class PumpTelemetryPanelComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly telemetry = inject(PUMP_TELEMETRY_SOURCE);
  protected readonly i18n = inject(TechnicalI18nService);
  readonly selectedPumpId = input<string | null>(null);
  readonly pumpSelected = output<string>();
  protected readonly xAxis = signal<TelemetryXAxis>('time');
  protected readonly yAxis = signal<TelemetryYAxis>('rateBpm');
  protected readonly sortKey = signal<TelemetrySortKey>('position');
  protected readonly sortDirection = signal<1 | -1>(1);
  protected readonly pumps = computed(() => orderPumps(this.store.state().pumps, this.store.state().manifolds));
  protected readonly positionIds = computed(() => pumpPositionIds(this.store.state().pumps, this.store.state().manifolds));
  protected readonly chartMax = computed(() => {
    const history = this.telemetry.history();
    const maximum = Math.max(1, ...this.pumps().flatMap((pump) => (history[pump.sap] ?? []).map((sample) => sample[this.yAxis()])));
    const step = 10 ** Math.floor(Math.log10(maximum));
    return Math.ceil(maximum / step) * step;
  });
  protected readonly yTicks = computed(() => [this.chartMax(), this.chartMax() * .75, this.chartMax() * .5, this.chartMax() * .25, 0]);
  protected readonly chartSeries = computed(() => this.pumps().map((pump, index) => {
    const samples = this.telemetry.history()[pump.sap] ?? [];
    return {
      pumpId: pump.sap,
      color: this.seriesColor(index),
      points: samples.map((sample, sampleIndex) => `${(samples.length <= 1 ? 0 : sampleIndex / (samples.length - 1) * 580).toFixed(1)},${(142 - sample[this.yAxis()] / this.chartMax() * 132).toFixed(1)}`).join(' '),
    };
  }));
  protected readonly timeLabels = computed(() => {
    const timestamps = Object.values(this.telemetry.history()).flatMap((samples) => samples.map((sample) => sample.timestamp)).sort();
    return { start: timestamps[0] ?? '', end: timestamps[timestamps.length - 1] ?? '' };
  });

  protected sample(pumpId: string): PumpTelemetrySample | null { return this.telemetry.latest()[pumpId] ?? null; }
  protected selectPump(pumpId: string): void { this.pumpSelected.emit(pumpId); }
  protected stateLabel(sample: PumpTelemetrySample | null): string {
    if (!sample) return this.i18n.ui('common.noSignal');
    return this.i18n.ui(`telemetry.${sample.signalStatus}`);
  }
  protected sortBy(key: TelemetrySortKey): void {
    if (this.sortKey() === key) this.sortDirection.update((direction) => direction === 1 ? -1 : 1);
    else { this.sortKey.set(key); this.sortDirection.set(1); }
  }
  protected sortMarker(key: TelemetrySortKey): string { return this.sortKey() === key ? this.sortDirection() === 1 ? '↑' : '↓' : ''; }
  protected seriesColor(index: number): string { return `hsl(${(index * 47) % 360} 72% 62%)`; }
}
