import { InjectionToken } from '@angular/core';
import { FailureCase, OperationalCapture, PrimeMaintenanceState, Pump, StageExecution } from '../models/prime.models';

export interface PumpTelemetryProvider {
  readPumpTelemetry(pumpId: string): Promise<Partial<Pump>>;
}

export interface AssetAvailabilityProvider {
  listAvailablePumps(): Promise<readonly Pump[]>;
}

export interface MaintenanceRepository {
  load(): PrimeMaintenanceState;
  save(state: PrimeMaintenanceState): void;
  loadPrimeDemo(): PrimeMaintenanceState;
}

export interface StageExecutionRepository {
  saveStage(stage: StageExecution): void;
}

export interface CaptureRepository {
  appendCapture(capture: OperationalCapture): void;
}

export interface AuthenticationContext {
  readonly currentUser: string;
}

export interface PrimeExportServiceContract {
  exportStage(state: PrimeMaintenanceState): Promise<string>;
}

export interface FailureCaseRepository {
  saveCase(failureCase: FailureCase): void;
}

export const MAINTENANCE_REPOSITORY = new InjectionToken<MaintenanceRepository>('MAINTENANCE_REPOSITORY');
export const AUTHENTICATION_CONTEXT = new InjectionToken<AuthenticationContext>('AUTHENTICATION_CONTEXT');
