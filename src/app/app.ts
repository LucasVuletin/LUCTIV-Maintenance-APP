import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ManifoldType, SetNumber, StageExecution, StageMode } from './core/models/prime.models';
import { PrimeExportService } from './core/services/prime-export.service';
import { PUMP_TELEMETRY_SOURCE } from './core/services/pump-telemetry.provider';
import { PrimeMaintenanceStore } from './core/services/prime-maintenance.store';
import { UiPreferencesService } from './core/services/ui-preferences.service';
import { LayoutComponent } from './features/layout/layout.component';
import { OperationComponent } from './features/operation/operation.component';
import { SttPlanComponent } from './features/stt-plan/stt-plan.component';
import { PRIME_SCHEMA_VERSION } from './prime/schema';

type AppTab = 'operation' | 'layout' | 'stt';

interface HeaderStats {
  readonly totalInSet: number;
  readonly operativeInSet: number;
  readonly operativeOutOfSet: number;
  readonly nonOperativeInSet: number;
  readonly nonOperativeOutOfSet: number;
  readonly dgbSubstitutionPercentage: number;
  readonly dgbInSet: number;
  readonly nonDgbInSet: number;
  readonly substitutingDgb: number;
  readonly nonSubstitutingDgb: number;
}

@Component({ selector: 'app-root', imports: [FormsModule, DatePipe, OperationComponent, LayoutComponent, SttPlanComponent], templateUrl: './app.html', styleUrl: './app.scss' })
export class App {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly telemetry = inject(PUMP_TELEMETRY_SOURCE);
  protected readonly preferences = inject(UiPreferencesService);
  private readonly exporter = inject(PrimeExportService);
  protected readonly activeTab = signal<AppTab>(this.initialTab());
  protected readonly isAddPumpOpen = signal(false);
  protected readonly isAddManifoldOpen = signal(false);
  protected readonly headerFormError = signal('');
  protected readonly newManifoldType = signal<ManifoldType>('dirty');
  protected readonly sets: SetNumber[] = [1, 2, 3, 4, 5, 6];
  protected readonly modes: readonly { value: StageMode; label: string }[] = [
    { value: 'zipperfrac', label: 'Zipperfrac' },
    { value: 'simulfrac', label: 'Simulfrac' },
    { value: 'dualfrac', label: 'Dualfrac' },
  ];
  protected readonly stats = computed<HeaderStats>(() => {
    const inSet = this.store.state().pumps.filter((pump) => pump.side !== 'bench');
    const outOfSet = this.store.state().pumps.filter((pump) => pump.side === 'bench');
    const isOperative = (status: string) => status.endsWith('Working') || status === 'Ready';
    const dgb = inSet.filter((pump) => pump.isDgb);
    const substituting = dgb.filter((pump) => pump.dgbSubstitutionPercentage > 0);
    return {
      totalInSet: inSet.length,
      operativeInSet: inSet.filter((pump) => isOperative(pump.currentStatus)).length,
      operativeOutOfSet: outOfSet.filter((pump) => isOperative(pump.currentStatus)).length,
      nonOperativeInSet: inSet.filter((pump) => !isOperative(pump.currentStatus)).length,
      nonOperativeOutOfSet: outOfSet.filter((pump) => !isOperative(pump.currentStatus)).length,
      dgbSubstitutionPercentage: dgb.length ? Math.round(dgb.reduce((total, pump) => total + pump.dgbSubstitutionPercentage, 0) / dgb.length) : 0,
      dgbInSet: dgb.length,
      nonDgbInSet: inSet.length - dgb.length,
      substitutingDgb: substituting.length,
      nonSubstitutingDgb: dgb.length - substituting.length,
    };
  });
  protected readonly offlineCount = computed(() => this.store.state().pumps.filter((pump) => ['down', 'offline'].includes(pump.dynamicStatus)).length);
  protected readonly alertCount = computed(() => this.store.state().pumps.filter((pump) => pump.dynamicStatus === 'warning').length + this.store.pendingAlerts().length);
  protected newPumpNumber = '';
  protected newManifoldSlots = 8;
  protected isFullscreen = Boolean(document.fullscreenElement);

  constructor() {
    document.addEventListener('fullscreenchange', () => { this.isFullscreen = Boolean(document.fullscreenElement); });
    effect(() => this.telemetry.syncPumps(this.store.state().pumps));
    if (this.activeTab() === 'layout') this.preferences.setHeaderCollapsed(true);
  }

  protected setTab(tab: AppTab): void {
    this.activeTab.set(tab);
    if (tab === 'layout') this.preferences.setHeaderCollapsed(true);
    history.replaceState(null, '', `${location.pathname}${location.search}#${tab}`);
  }

  protected updateStage(field: 'pad' | 'well' | 'secondaryWell' | 'capturedBy', value: string): void {
    const stage = { ...this.store.state().stage, [field]: value };
    this.store.updateStage({ [field]: value, stageExecutionId: this.stageId(stage) });
  }

  protected updateSet(value: string | number): void {
    const stage = { ...this.store.state().stage, setId: Number(value) as SetNumber };
    this.store.updateStage({ setId: stage.setId, stageExecutionId: this.stageId(stage) });
  }

  protected updateStageNumber(value: string | number, secondary = false): void {
    const stageNumber = Math.max(0, Math.round(Number(value)));
    const stage = secondary
      ? { ...this.store.state().stage, secondaryStage: stageNumber }
      : { ...this.store.state().stage, stage: stageNumber };
    this.store.updateStage(secondary
      ? { secondaryStage: stageNumber, stageExecutionId: this.stageId(stage) }
      : { stage: stageNumber, stageExecutionId: this.stageId(stage) });
  }

  protected updateMode(mode: StageMode): void {
    const stage = { ...this.store.state().stage, mode };
    this.store.updateStage({ mode, stageExecutionId: this.stageId(stage) });
  }

  protected isDualMode(): boolean {
    return this.store.state().stage.mode !== 'zipperfrac';
  }

  protected openAddPump(): void {
    this.newPumpNumber = '';
    this.headerFormError.set('');
    this.isAddPumpOpen.set(true);
  }

  protected addPump(): void {
    const error = this.store.addPump(this.newPumpNumber);
    this.headerFormError.set(error ?? '');
    if (!error) this.isAddPumpOpen.set(false);
  }

  protected openAddManifold(): void {
    this.newManifoldType.set('dirty');
    this.newManifoldSlots = 8;
    this.isAddManifoldOpen.set(true);
  }

  protected addManifold(): void {
    this.store.addManifold(this.newManifoldType(), this.newManifoldSlots);
  }

  protected updateManifoldSlots(manifoldId: string, value: string | number): void {
    const manifold = this.store.state().manifolds.find((entry) => entry.id === manifoldId);
    if (!manifold) return;
    const pumpsPerSide = Math.max(1, Math.min(12, Math.round(Number(value))));
    this.store.updateManifold({ ...manifold, pumpsPerSide });
  }

  protected simulateFailure(): void {
    this.store.simulateFailure();
    this.setTab('operation');
  }

  protected saveLayout(): void {
    this.store.saveLayout();
  }

  protected clearLayout(): void {
    if (window.confirm('¿Mover todas las bombas al banco de reserva? Los casos PRIME se conservarán.')) this.store.clearLayout();
  }

  protected captureStage(): void {
    this.store.appendCapture('Manual');
    this.downloadLayoutCapture();
  }

  protected async exportExcel(): Promise<void> {
    await this.exporter.exportStage(this.store.state());
  }

  protected async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  protected downloadLayoutCapture(): void {
    const state = this.store.state();
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const lines = state.pumps.map((pump, index) => `${index + 1}. PUMP ${pump.sap} · ${pump.currentStatus} · ${pump.conditionClass}${pump.isDgb ? ' · DGB' : ''}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${Math.max(800, lines.length * 34 + 270)}"><rect width="100%" height="100%" fill="#08111f"/><text x="60" y="75" fill="#f8fafc" font-family="Segoe UI" font-size="38" font-weight="700">LUCTIV: Maintenance APP</text><text x="60" y="120" fill="#b8d0db" font-family="Segoe UI" font-size="23">${escape(state.stage.pad)} · Pozo ${escape(state.stage.well)} · Etapa ${state.stage.stage} · SET ${state.stage.setId}</text><text x="60" y="158" fill="#94a3b8" font-family="Segoe UI" font-size="18">${escape(state.stage.stageExecutionId)} · PRIME ${PRIME_SCHEMA_VERSION}</text>${lines.map((line, index) => `<text x="60" y="${220 + index * 34}" fill="#e2e8f0" font-family="Consolas" font-size="19">${escape(line)}</text>`).join('')}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d')?.drawImage(image, 0, 0);
      const anchor = document.createElement('a');
      anchor.download = `LUCTIV_${state.stage.pad}_W${state.stage.well}_S${state.stage.stage}_layout.png`;
      anchor.href = canvas.toDataURL('image/png');
      anchor.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  private initialTab(): AppTab {
    const tab = location.hash.slice(1);
    return tab === 'operation' || tab === 'stt' ? tab : 'layout';
  }

  private stageId(stage: StageExecution): string {
    const secondary = stage.mode === 'zipperfrac' || !stage.secondaryWell || stage.secondaryStage === null
      ? ''
      : `-W${stage.secondaryWell}-S${stage.secondaryStage}`;
    return `${stage.pad}-SET${stage.setId}-W${stage.well}-S${stage.stage}${secondary}-${stage.mode}`.replace(/[^A-Za-z0-9-]/g, '-');
  }
}
