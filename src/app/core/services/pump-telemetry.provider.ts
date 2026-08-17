import { InjectionToken, Signal } from '@angular/core';
import { Pump } from '../models/prime.models';
import { PumpTelemetrySample } from '../models/telemetry.models';

export interface PumpTelemetrySource {
  readonly latest: Signal<Readonly<Record<string, PumpTelemetrySample>>>;
  readonly history: Signal<Readonly<Record<string, readonly PumpTelemetrySample[]>>>;
  readonly lastUpdatedAt: Signal<string | null>;
  syncPumps(pumps: readonly Pump[]): void;
}

export const PUMP_TELEMETRY_SOURCE = new InjectionToken<PumpTelemetrySource>('PUMP_TELEMETRY_SOURCE');
