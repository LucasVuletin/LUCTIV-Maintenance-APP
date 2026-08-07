import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaseValidationErrors, FailureCase } from '../../core/models/prime.models';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { PRIME_CATALOGS } from '../../prime/catalogs';

@Component({
  selector: 'app-operation',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './operation.component.html',
  styleUrl: './operation.component.scss',
})
export class OperationComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly catalogs = PRIME_CATALOGS;
  protected readonly selectedCaseId = signal<string | null>(null);
  protected readonly errors = signal<CaseValidationErrors>({});
  protected draft: FailureCase | null = null;

  constructor() {
    const workflowPump = new URLSearchParams(location.search).get('workflow');
    const failureCase = workflowPump ? this.store.openCases().find((entry) => entry.affectedPumpId === workflowPump) : null;
    if (failureCase) this.openWorkflow(failureCase);
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
    if (!pump) return 'Sin posición';
    return pump.side === 'bench' ? 'Off set' : `${pump.side === 'left' ? 'L' : 'R'}-${pump.position}`;
  }
}
