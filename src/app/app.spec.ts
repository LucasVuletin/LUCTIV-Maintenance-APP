import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LocalMaintenanceRepository } from './core/services/local-maintenance.repository';
import { MAINTENANCE_REPOSITORY } from './core/services/maintenance-repository';
import { PUMP_TELEMETRY_SOURCE } from './core/services/pump-telemetry.provider';
import { SimulatedPumpTelemetryService } from './core/services/simulated-pump-telemetry.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: MAINTENANCE_REPOSITORY, useClass: LocalMaintenanceRepository },
        { provide: PUMP_TELEMETRY_SOURCE, useClass: SimulatedPumpTelemetryService },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the LUCTIV product name', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'LUCTIV Maintenance APP',
    );
  });
});
