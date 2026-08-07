import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SetNumber } from './core/models/prime.models';
import { PrimeMaintenanceStore } from './core/services/prime-maintenance.store';
import { LayoutComponent } from './features/layout/layout.component';
import { OperationComponent } from './features/operation/operation.component';
import { SttPlanComponent } from './features/stt-plan/stt-plan.component';
import { TraceabilityComponent } from './features/traceability/traceability.component';
import { PRIME_SCHEMA_VERSION } from './prime/schema';

type AppTab = 'operation' | 'layout' | 'stt' | 'traceability';

@Component({ selector: 'app-root', imports: [FormsModule, OperationComponent, LayoutComponent, SttPlanComponent, TraceabilityComponent], templateUrl: './app.html', styleUrl: './app.scss' })
export class App {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly activeTab = signal<AppTab>(this.initialTab());
  protected readonly schemaVersion = PRIME_SCHEMA_VERSION;
  protected readonly notice = signal('');
  protected readonly sets: SetNumber[] = [1, 2, 3, 4, 5, 6];
  protected isFullscreen = Boolean(document.fullscreenElement);

  constructor() { document.addEventListener('fullscreenchange', () => { this.isFullscreen = Boolean(document.fullscreenElement); }); }

  protected setTab(tab: AppTab): void { this.activeTab.set(tab); history.replaceState(null, '', `${location.pathname}${location.search}#${tab}`); }
  protected updateStage(field: 'pad' | 'spreadIdentifier' | 'crewName' | 'well' | 'capturedBy' | 'exportedBy', value: string): void { const stage = { ...this.store.state().stage, [field]: value }; this.store.updateStage({ [field]: value, stageExecutionId: this.stageId(stage.pad, stage.setId, stage.well, stage.stage) }); }
  protected updateSet(value: string | number): void { const setId = Number(value) as SetNumber; const stage = this.store.state().stage; this.store.updateStage({ setId, stageExecutionId: this.stageId(stage.pad, setId, stage.well, stage.stage) }); }
  protected updateStageNumber(value: string | number): void { const number = Math.max(0, Math.round(Number(value))); const stage = this.store.state().stage; this.store.updateStage({ stage: number, stageExecutionId: this.stageId(stage.pad, stage.setId, stage.well, number) }); }
  protected updateTarget(value: string | number): void { this.store.updateStage({ targetMinutes: Math.max(1, Math.round(Number(value))) }); }
  protected simulateFailure(): void { const failureCase = this.store.simulateFailure(); this.notice.set(failureCase ? `Alerta PRIME vinculada a ${failureCase.caseId}.` : 'No hay bombas sanas en SET para simular una caída.'); this.activeTab.set('operation'); }
  protected loadDemo(): void { if (!window.confirm('¿Cargar el escenario PRIME de ocho bombas? Los datos locales actuales serán reemplazados.')) return; this.store.loadPrimeDemo(); this.notice.set('Escenario de aceptación PRIME cargado.'); this.activeTab.set('operation'); }
  protected async toggleFullscreen(): Promise<void> { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  protected dgbCount(): number { return this.store.state().pumps.filter((pump) => pump.isDgb).length; }

  protected downloadLayoutCapture(): void {
    const state = this.store.state();
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const lines = state.pumps.map((pump, index) => `${index + 1}. PUMP ${pump.sap} · ${pump.currentStatus} · ${pump.conditionClass}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${Math.max(800, lines.length * 34 + 270)}"><rect width="100%" height="100%" fill="#08111f"/><text x="60" y="75" fill="#f8fafc" font-family="Segoe UI" font-size="38" font-weight="700">LUCTIV: Maintenance APP</text><text x="60" y="120" fill="#b8d0db" font-family="Segoe UI" font-size="23">${escape(state.stage.pad)} · Pozo ${escape(state.stage.well)} · Etapa ${state.stage.stage} · SET ${state.stage.setId}</text><text x="60" y="158" fill="#94a3b8" font-family="Segoe UI" font-size="18">${escape(state.stage.stageExecutionId)} · PRIME ${PRIME_SCHEMA_VERSION}</text>${lines.map((line, index) => `<text x="60" y="${220 + index * 34}" fill="#e2e8f0" font-family="Consolas" font-size="19">${escape(line)}</text>`).join('')}</svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const image = new Image();
    image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d')?.drawImage(image, 0, 0); const anchor = document.createElement('a'); anchor.download = `LUCTIV_${state.stage.pad}_W${state.stage.well}_S${state.stage.stage}_layout.png`; anchor.href = canvas.toDataURL('image/png'); anchor.click(); URL.revokeObjectURL(url); };
    image.src = url;
  }

  private initialTab(): AppTab { const tab = location.hash.slice(1); return tab === 'layout' || tab === 'stt' || tab === 'traceability' ? tab : 'operation'; }
  private stageId(pad: string, setId: number, well: string, stage: number): string { return `${pad}-SET${setId}-W${well}-S${stage}`.replace(/[^A-Za-z0-9-]/g, '-'); }
}
