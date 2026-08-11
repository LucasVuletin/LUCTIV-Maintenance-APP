import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { LocalMaintenanceRepository } from './core/services/local-maintenance.repository';
import { MAINTENANCE_REPOSITORY } from './core/services/maintenance-repository';
import { PUMP_TELEMETRY_SOURCE } from './core/services/pump-telemetry.provider';
import { SimulatedPumpTelemetryService } from './core/services/simulated-pump-telemetry.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    { provide: MAINTENANCE_REPOSITORY, useExisting: LocalMaintenanceRepository },
    { provide: PUMP_TELEMETRY_SOURCE, useExisting: SimulatedPumpTelemetryService },
  ],
};
