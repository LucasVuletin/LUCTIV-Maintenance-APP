export type TelemetrySignalStatus = 'pumping' | 'standby' | 'warning' | 'offline' | 'no-communication';

export interface PumpTelemetrySample {
  readonly pumpId: string;
  readonly timestamp: string;
  readonly engineLoadPct: number;
  readonly engineRpm: number;
  readonly dischargePressurePsi: number;
  readonly rateBpm: number;
  readonly signalStatus: TelemetrySignalStatus;
}

export interface TelemetryPumpIdentity {
  readonly pumpId: string;
  readonly unitId: string;
}

export interface TelemetrySeries {
  readonly pumpId: string;
  readonly samples: readonly PumpTelemetrySample[];
}
