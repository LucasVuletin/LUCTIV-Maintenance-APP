import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaseValidationErrors, FailureCase } from '../../core/models/prime.models';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { TechnicalI18nService } from '../../core/services/technical-i18n.service';
import { PRIME_CATALOGS } from '../../prime/catalogs';

@Component({
  selector: 'app-operation',
  imports: [FormsModule, NgTemplateOutlet, DatePipe],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.scss',
})
export class OperationComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly i18n = inject(TechnicalI18nService);
  protected readonly catalogs = PRIME_CATALOGS;
  protected readonly selectedCaseId = signal<string | null>(null);
  protected readonly errors = signal<CaseValidationErrors>({});
  protected readonly acknowledgedCases = computed(() => this.store.state().failureCases.filter((failureCase) => failureCase.acknowledgedAt).sort((left, right) => Date.parse(right.acknowledgedAt ?? '') - Date.parse(left.acknowledgedAt ?? '')));
  protected draft: FailureCase | null = null;

  constructor() {
    const workflowPump = new URLSearchParams(location.search).get('workflow');
    const failureCase = workflowPump ? this.store.openCases().find((entry) => entry.affectedPumpId === workflowPump) : null;
    if (failureCase) this.openWorkflow(failureCase);
  }

  protected fallenCount(): number {
    return this.store.state().pumps.filter((pump) => pump.dynamicStatus === 'down' || pump.dynamicStatus === 'offline').length;
  }

  protected selectedUnitCount(): number {
    return this.store.selectedCases().length + this.store.selectedCases().filter((failureCase) => failureCase.replacementPumpId).length;
  }

  protected openWorkflow(failureCase: FailureCase): void {
    this.selectedCaseId.set(failureCase.caseId);
    this.draft = structuredClone(failureCase);
    this.errors.set({});
  }

  protected closeWorkflow(): void {
    this.selectedCaseId.set(null);
    this.draft = null;
    this.errors.set({});
  }

  protected acknowledge(): void {
    if (!this.draft) return;
    this.store.acknowledgeCase(this.draft.caseId);
    this.draft.acknowledgedAt = new Date().toISOString();
  }

  protected saveCharacterization(): boolean {
    if (!this.draft) return false;
    const errors = this.store.saveCase(this.draft);
    this.errors.set(errors);
    if (Object.values(errors).some(Boolean)) return false;
    this.draft = structuredClone(this.store.caseById(this.draft.caseId));
    return true;
  }

  protected decide(decision: 'include' | 'backlog' | 'base' | 'monitor' | 'not-required'): void {
    if (!this.draft || !this.saveCharacterization()) return;
    this.store.decideCase(this.draft.caseId, decision);
    this.closeWorkflow();
  }

  protected pumpPosition(pumpId: string): string {
    const pump = this.store.pumpBySap(pumpId);
    if (!pump) return this.i18n.ui('operation.noPosition');
    return pump.side === 'bench' ? 'Off set' : `${pump.side === 'left' ? 'L' : 'R'}-${pump.position}`;
  }

  protected swapSuggestion(failureCase: FailureCase): string | null {
    if (failureCase.conditionClass !== 'Broken') return null;
    return failureCase.replacementPumpId
      ?? this.store.state().pumps.find((pump) => pump.side === 'bench' && pump.dynamicStatus === 'available')?.sap
      ?? null;
  }

  protected downloadHistory(): void {
    const headers = ['CaptureId', 'FailureDetectedAt', 'CapturedBy', 'PumpId', 'Manifold', 'Position', 'CurrentStatus', 'FailureReason', 'ResponsibleGroup', 'PartOfPlan', 'PlannedAction', 'ReplacementPumpId', 'MinutesToRecovery', 'TaskDescription', 'Comments'];
    const rows = this.acknowledgedCases().map((failureCase) => [
      this.latestCaptureId(failureCase.caseId), failureCase.firstDetectedAt, this.store.state().stage.capturedBy,
      failureCase.affectedPumpId, this.manifoldForPump(failureCase.affectedPumpId), this.pumpPosition(failureCase.affectedPumpId),
      failureCase.workStatus, failureCase.failureReason, failureCase.responsibleGroup, failureCase.partOfPlan,
      failureCase.plannedAction, failureCase.replacementPumpId ?? '', failureCase.minutesToRecovery ?? '',
      failureCase.taskDescription, failureCase.comments,
    ]);
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `LUCTIV_historial_caidas_${this.store.state().stage.stageExecutionId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected latestCaptureId(caseId: string): string {
    return [...this.store.state().captures].reverse().find((capture) => capture.rows.some((row) => row.CaseId === caseId))?.captureId ?? '—';
  }

  protected manifoldForPump(pumpId: string): string {
    const pump = this.store.pumpBySap(pumpId);
    return this.store.state().manifolds.find((manifold) => manifold.id === pump?.manifoldId)?.label ?? 'Off set';
  }
}
