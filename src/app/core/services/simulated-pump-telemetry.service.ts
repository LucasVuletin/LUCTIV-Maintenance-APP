import { Injectable, OnDestroy, signal } from '@angular/core';
import { Pump } from '../models/prime.models';
import { PumpTelemetrySample, TelemetrySignalStatus } from '../models/telemetry.models';
import { PumpTelemetrySource } from './pump-telemetry.provider';

@Injectable({ providedIn: 'root' })
export class SimulatedPumpTelemetryService implements PumpTelemetrySource, OnDestroy {
  readonly latest = signal<Readonly<Record<string, PumpTelemetrySample>>>({});
  readonly history = signal<Readonly<Record<string, readonly PumpTelemetrySample[]>>>({});
  readonly lastUpdatedAt = signal<string | null>(null);
  private readonly pumps = new Map<string, Pump>();
  private tickIndex = 0;
  private readonly timer = window.setInterval(() => this.tick(), 2000);

  syncPumps(pumps: readonly Pump[]): void {
    const activeIds = new Set(pumps.map((pump) => pump.sap));
    let changed = pumps.length !== this.pumps.size;
    for (const pump of pumps) {
      const previous = this.pumps.get(pump.sap);
      if (!previous || previous.dynamicStatus !== pump.dynamicStatus || previous.pumpRate !== pump.pumpRate) changed = true;
      this.pumps.set(pump.sap, structuredClone(pump));
    }
    for (const pumpId of this.pumps.keys()) if (!activeIds.has(pumpId)) this.pumps.delete(pumpId);
    if (changed || pumps.some((pump) => !this.latest()[pump.sap])) this.tick();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.timer);
  }

  private tick(): void {
    if (!this.pumps.size) return;
    const timestamp = new Date().toISOString();
    this.tickIndex += 1;
    const latest = { ...this.latest() };
    const history = { ...this.history() };
    for (const pump of this.pumps.values()) {
      const sample = this.sampleFor(pump, timestamp);
      latest[pump.sap] = sample;
      history[pump.sap] = [...(history[pump.sap] ?? []), sample].slice(-120);
    }
    this.latest.set(latest);
    this.history.set(history);
    this.lastUpdatedAt.set(timestamp);
  }

  private sampleFor(pump: Pump, timestamp: string): PumpTelemetrySample {
    const seed = [...pump.sap].reduce((total, character) => total + character.charCodeAt(0), 0);
    const wave = Math.sin((this.tickIndex + seed) / 4);
    const jitter = Math.sin((this.tickIndex * 1.7 + seed) / 3);
    const status = pump.dynamicStatus;
    let signalStatus: TelemetrySignalStatus = 'pumping';
    let engineLoadPct = 72 + (seed % 20) + wave * 3;
    let engineRpm = 1780 + (seed % 130) + wave * 24;
    let dischargePressurePsi = 9800 + (seed % 1800) + jitter * 90;
    const simulatedOperatingRate = 4.2 + (seed % 16) / 10;
    let rateBpm = (pump.dynamicStatus === 'running' && (!pump.pumpRate || pump.pumpRate <= 0) ? simulatedOperatingRate : pump.pumpRate ?? simulatedOperatingRate) + wave * .12;
    if (status === 'available') {
      signalStatus = 'standby';
      engineLoadPct = 4 + Math.abs(wave * 2);
      engineRpm = 700 + wave * 10;
      dischargePressurePsi = 0;
      rateBpm = 0;
    } else if (status === 'warning') {
      signalStatus = 'warning';
      engineLoadPct = 88 + wave * 8;
      engineRpm = 1660 + jitter * 100;
      dischargePressurePsi = 8500 + wave * 800;
      rateBpm = Math.max(0, rateBpm - 1.1 + jitter * .35);
    } else if (status === 'down') {
      signalStatus = 'offline';
      engineLoadPct = 0;
      engineRpm = 0;
      dischargePressurePsi = 0;
      rateBpm = 0;
    } else if (status === 'offline') {
      signalStatus = 'no-communication';
      engineLoadPct = 0;
      engineRpm = 0;
      dischargePressurePsi = 0;
      rateBpm = 0;
    } else if (status === 'maintenance') {
      signalStatus = 'standby';
      engineLoadPct = 0;
      engineRpm = 0;
      dischargePressurePsi = 0;
      rateBpm = 0;
    }
    if (rateBpm <= 0 && signalStatus === 'pumping') signalStatus = 'standby';
    return {
      pumpId: pump.sap,
      timestamp,
      engineLoadPct: Math.round(Math.max(0, Math.min(100, engineLoadPct))),
      engineRpm: Math.round(Math.max(0, engineRpm)),
      dischargePressurePsi: Math.round(Math.max(0, dischargePressurePsi)),
      rateBpm: Math.round(Math.max(0, rateBpm) * 10) / 10,
      signalStatus,
    };
  }
}
