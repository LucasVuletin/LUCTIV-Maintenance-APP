import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LocalMaintenanceRepository } from './core/services/local-maintenance.repository';
import { MAINTENANCE_REPOSITORY } from './core/services/maintenance-repository';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: MAINTENANCE_REPOSITORY, useClass: LocalMaintenanceRepository }],
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
      'LUCTIV: Maintenance APP',
    );
  });
});
