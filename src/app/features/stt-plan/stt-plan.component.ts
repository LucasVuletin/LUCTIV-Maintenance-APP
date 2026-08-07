import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FailureCase } from '../../core/models/prime.models';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { PRIME_CATALOGS } from '../../prime/catalogs';

interface CompletionDraft { actualAction: string; confirmedFailureReason: string; resolutionOutcome: string; returnToService: boolean; technicalValidationConfirmed: boolean; }

@Component({ selector: 'app-stt-plan', imports: [FormsModule], templateUrl: './stt-plan.component.html', styleUrl: './stt-plan.component.scss' })
export class SttPlanComponent implements OnDestroy {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly catalogs = PRIME_CATALOGS;
  protected readonly now = signal(Date.now());
  protected readonly completionCaseId = signal<string | null>(null);
  protected completionDraft: CompletionDraft = { actualAction: '', confirmedFailureReason: '', resolutionOutcome: '', returnToService: false, technicalValidationConfirmed: false };
  protected completionError = '';
  private readonly timer = window.setInterval(() => this.now.set(Date.now()), 1000);
  constructor() {
    const executionPump = new URLSearchParams(location.search).get('execution');
    const failureCase = executionPump ? this.store.openCases().find((entry) => entry.affectedPumpId === executionPump) : null;
    if (failureCase && failureCase.workStatus !== 'In progress') this.store.startWork(failureCase.caseId);
  }
  ngOnDestroy(): void { window.clearInterval(this.timer); }
  protected allCandidates(): FailureCase[] { return [...this.store.openCases()].sort((a, b) => Number(b.partOfPlan === 'Yes') - Number(a.partOfPlan === 'Yes') || (a.sttOrder ?? 99) - (b.sttOrder ?? 99)); }
  protected elapsed(failureCase: FailureCase): string { if (!failureCase.workStartAt) return '00:00'; const end = failureCase.workEndAt ? Date.parse(failureCase.workEndAt) : this.now(); const seconds = Math.max(0, Math.floor((end - Date.parse(failureCase.workStartAt)) / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
  protected select(failureCase: FailureCase): void { this.store.decideCase(failureCase.caseId, 'include'); }
  protected defer(failureCase: FailureCase): void { this.store.decideCase(failureCase.caseId, 'backlog'); }
  protected openCompletion(failureCase: FailureCase): void { this.completionCaseId.set(failureCase.caseId); this.completionDraft = { actualAction: '', confirmedFailureReason: '', resolutionOutcome: '', returnToService: false, technicalValidationConfirmed: false }; this.completionError = ''; }
  protected finish(): void { const caseId = this.completionCaseId(); if (!caseId) return; const errors = this.store.finishWork(caseId, this.completionDraft.actualAction, this.completionDraft.confirmedFailureReason, this.completionDraft.resolutionOutcome, this.completionDraft.returnToService, this.completionDraft.technicalValidationConfirmed); const first = Object.values(errors).find(Boolean); if (first) { this.completionError = first; return; } this.completionCaseId.set(null); }
}
