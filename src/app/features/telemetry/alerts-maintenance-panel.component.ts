import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Input, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FailureCase } from '../../core/models/prime.models';
import { PUMP_TELEMETRY_SOURCE } from '../../core/services/pump-telemetry.provider';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { PRIME_CATALOGS } from '../../prime/catalogs';

@Component({ selector: 'app-alerts-maintenance-panel', imports: [FormsModule, DatePipe], templateUrl: './alerts-maintenance-panel.component.html', styleUrl: './alerts-maintenance-panel.component.scss' })
export class AlertsMaintenancePanelComponent {
  readonly maintenanceStore = input.required<PrimeMaintenanceStore>();
  private readonly identityValue = signal('[]');
  @Input() set identityJson(value: string) { this.identityValue.set(value || '[]'); }
  protected readonly telemetry = inject(PUMP_TELEMETRY_SOURCE);
  protected readonly catalogs = PRIME_CATALOGS;
  protected get store(): PrimeMaintenanceStore { return this.maintenanceStore(); }
  protected readonly identities = computed<readonly { unitId: string; pumpId: string }[]>(() => {
    try { return JSON.parse(this.identityValue()) as { unitId: string; pumpId: string }[]; } catch { return []; }
  });
  protected readonly providerUnitIds = computed(() => Object.keys(this.telemetry.latest()));
  protected readonly unitIds = computed(() => this.providerUnitIds().length ? this.providerUnitIds() : this.identities().map((identity) => identity.unitId));
  protected readonly positionIds = computed(() => {
    const configured = new Map(this.identities().map((identity) => [identity.unitId, identity.pumpId]));
    return Object.fromEntries(this.unitIds().map((unitId, index) => [unitId, configured.get(unitId) ?? `P${index + 1}`]));
  });
  protected readonly activeCases = computed(() => this.store.openCases().filter((failureCase) => !failureCase.acknowledgedAt && !failureCase.queueClearedAt));
  protected readonly message = signal('');
  protected readonly recognitionOpen = signal(false);
  protected recognitionDraft: FailureCase | null = null;
  protected recognitionMode: 'automatic' | 'manual' = 'automatic';
  protected taskPumpId = '';
  protected taskDepartment: 'PE' | 'IEM' = 'PE';
  protected taskDetail = '';
  private readonly notifiedCases = new Set<string>();

  constructor() {
    effect(() => {
      const pending = this.activeCases().find((failureCase) => !this.notifiedCases.has(failureCase.caseId));
      if (!pending) return;
      this.notifiedCases.add(pending.caseId);
      queueMicrotask(() => this.openRecognition(pending));
    });
  }

  protected openRecognition(failureCase: FailureCase): void {
    this.recognitionDraft = structuredClone(failureCase);
    this.recognitionMode = failureCase.detectionSource === 'Manual - Field' ? 'manual' : 'automatic';
    this.message.set('');
    this.recognitionOpen.set(true);
  }

  protected confirmRecognition(): void {
    if (!this.recognitionDraft) return;
    const errors = this.store.saveCase(this.recognitionDraft);
    const error = Object.values(errors).find(Boolean);
    if (error) {
      this.message.set(error);
      return;
    }
    this.store.acknowledgeCase(this.recognitionDraft.caseId);
    this.recognitionOpen.set(false);
    this.recognitionDraft = null;
  }

  protected clearQueue(): void {
    if (!window.confirm('¿Está de acuerdo con limpiar las alertas y mantenimientos visibles? Los casos permanecerán en trazabilidad.')) return;
    this.store.clearOperationalQueue();
  }

  protected createTask(): void {
    if (!this.taskPumpId || !this.taskDetail.trim()) {
      this.message.set('Seleccioná una bomba y describí la tarea.');
      return;
    }
    let failureCase = this.store.openCases().find((entry) => entry.affectedPumpId === this.taskPumpId) ?? null;
    if (!failureCase) failureCase = this.store.detectFailure(this.taskPumpId, 'Otro', this.taskDetail.trim(), 'Manual - Field');
    if (!failureCase) {
      this.message.set('No se pudo crear el caso de mantenimiento.');
      return;
    }
    const errors = this.store.saveCase({
      ...failureCase,
      responsibleGroup: this.taskDepartment,
      plannedAction: 'Inspect',
      minutesToRecovery: failureCase.minutesToRecovery ?? 15,
      taskDescription: this.taskDetail.trim(),
      partOfPlan: 'No',
      sttOrder: null,
      sttReadiness: 'Ready',
      workStatus: 'Backlog',
      deferredReason: 'Planificado para próximo STT.',
      queueClearedAt: null,
    });
    const error = Object.values(errors).find(Boolean);
    this.message.set(error ?? `Tarea ${this.taskDepartment} vinculada a ${failureCase.caseId}.`);
    if (!error) this.taskDetail = '';
  }
}
