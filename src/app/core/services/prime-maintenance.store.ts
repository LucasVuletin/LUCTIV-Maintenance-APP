import { computed, inject, Injectable, signal } from '@angular/core';
import { createOrUpdateFailureCase, applyCaseChanges } from '../../prime/case-logic';
import { createOperationalCapture } from '../../prime/capture-logic';
import { findFailureRule } from '../../prime/failure-rules';
import { validateFailureCase } from '../../prime/validation';
import { CaseValidationErrors, CaptureMoment, FailureCase, Manifold, PrimeMaintenanceState, Pump, SlotTarget, StageExecution } from '../models/prime.models';
import { MAINTENANCE_REPOSITORY } from './maintenance-repository';

export interface PlanEstimate {
  peMinutes: number;
  iemMinutes: number;
  projectedMinutes: number;
  targetMinutes: number;
  status: 'fit' | 'risk' | 'exceeds';
}

@Injectable({ providedIn: 'root' })
export class PrimeMaintenanceStore {
  private readonly repository = inject(MAINTENANCE_REPOSITORY);
  readonly state = signal<PrimeMaintenanceState>(this.repository.load());
  readonly openCases = computed(() => this.state().failureCases.filter((failureCase) => !failureCase.closedAt));
  readonly closedCases = computed(() => this.state().failureCases.filter((failureCase) => Boolean(failureCase.closedAt)));
  readonly pendingAlerts = computed(() => this.openCases().filter((failureCase) => !failureCase.acknowledgedAt));
  readonly criticalCases = computed(() => this.openCases().filter((failureCase) => ['Broken', 'Under diagnosis'].includes(failureCase.conditionClass)));
  readonly nearLimitCases = computed(() => this.openCases().filter((failureCase) => ['Almost / Consumable', 'Operational condition'].includes(failureCase.conditionClass)));
  readonly selectedCases = computed(() => this.openCases().filter((failureCase) => failureCase.partOfPlan === 'Yes').sort((left, right) => (left.sttOrder ?? 99) - (right.sttOrder ?? 99)));
  readonly backlogCases = computed(() => this.openCases().filter((failureCase) => failureCase.partOfPlan === 'No'));
  readonly planEstimate = computed<PlanEstimate>(() => {
    const selected = this.selectedCases();
    const peMinutes = selected.filter((entry) => entry.responsibleGroup === 'PE').reduce((sum, entry) => sum + (entry.minutesToRecovery ?? 0) + (entry.replacementPumpId ? 5 : 0), 0);
    const iemMinutes = selected.filter((entry) => entry.responsibleGroup !== 'PE').reduce((sum, entry) => sum + (entry.minutesToRecovery ?? 0) + (entry.replacementPumpId ? 5 : 0), 0);
    const projectedMinutes = Math.max(peMinutes, iemMinutes);
    const targetMinutes = this.state().stage.targetMinutes;
    const status = projectedMinutes > targetMinutes ? 'exceeds' : projectedMinutes >= targetMinutes * 0.8 ? 'risk' : 'fit';
    return { peMinutes, iemMinutes, projectedMinutes, targetMinutes, status };
  });
  readonly availablePumps = computed(() => this.state().pumps.filter((pump) => ['Rigged Out - Working', 'Ready'].includes(pump.currentStatus)));

  updateStage(changes: Partial<StageExecution>): void {
    this.update((state) => ({ ...state, stage: { ...state.stage, ...changes } }));
  }

  acknowledgeCase(caseId: string): void {
    this.updateCaseUnchecked(caseId, { acknowledgedAt: new Date().toISOString() });
  }

  simulateFailure(): FailureCase | null {
    const state = this.state();
    const pump = state.pumps.find((entry) => entry.side !== 'bench' && entry.conditionClass === 'Healthy / Available');
    if (!pump) return null;
    const reasons = ['Cavitación', 'Falla DPM', 'ACE / Windows / Daisy Data'];
    const reason = reasons[state.failureCases.length % reasons.length];
    return this.detectFailure(pump.sap, reason, `Alerta simulada para bomba ${pump.sap}.`, 'Rule Engine');
  }

  detectFailure(pumpId: string, failureReason: string, evidence: string, detectionSource: string): FailureCase | null {
    const state = this.state();
    const pump = state.pumps.find((entry) => entry.sap === pumpId);
    if (!pump) return null;
    const now = new Date().toISOString();
    const rule = findFailureRule(failureReason);
    const sequence = (state.caseSequenceByPump[pumpId] ?? 0) + (state.failureCases.some((entry) => entry.affectedPumpId === pumpId && !entry.closedAt) ? 0 : 1);
    const failureCase = createOrUpdateFailureCase(state.failureCases, state.stage, {
      affectedPumpId: pumpId,
      detectionSource,
      failureArea: rule?.FailureArea ?? 'Unknown',
      failureReason,
      failureEvidence: evidence,
      diagnosisStatus: 'Under diagnosis',
      responsibleGroup: rule?.ResponsibleGroup ?? 'Unknown',
      conditionClass: rule?.ConditionClass ?? 'Under diagnosis',
      plannedAction: rule?.SuggestedAction ?? 'Diagnose',
      minutesToRecovery: typeof rule?.DefaultMinutes === 'number' ? rule.DefaultMinutes : null,
      taskDescription: rule?.DefaultTaskDescription ?? 'Diagnosticar condición reportada.',
      ruleId: rule?.RuleId ?? null,
      ruleStatus: rule?.RuleStatus === 'Source example' ? 'Source example' : rule ? 'Draft - technical validation required' : null,
    }, sequence, now);
    this.update((current) => {
      const hasCase = current.failureCases.some((entry) => entry.caseId === failureCase.caseId);
      const next: PrimeMaintenanceState = {
        ...current,
        pumps: current.pumps.map((entry) => entry.sap === pumpId ? { ...entry, currentStatus: entry.side === 'bench' ? 'Rigged Out - Not Working' : 'Rigged In - Not Working', conditionClass: failureCase.conditionClass } : entry),
        failureCases: hasCase ? current.failureCases.map((entry) => entry.caseId === failureCase.caseId ? failureCase : entry) : [...current.failureCases, failureCase],
        caseSequenceByPump: { ...current.caseSequenceByPump, [pumpId]: sequence },
      };
      const capture = createOperationalCapture(next, 'Failure detection', now);
      return { ...next, captures: [...next.captures, capture], captureSequence: next.captureSequence + 1 };
    });
    return failureCase;
  }

  saveCase(candidate: FailureCase): CaseValidationErrors {
    const next = applyCaseChanges(this.caseById(candidate.caseId) ?? candidate, candidate, new Date().toISOString());
    const errors = validateFailureCase(next, this.state().pumps);
    if (Object.values(errors).some(Boolean)) return errors;
    this.updateCaseUnchecked(candidate.caseId, next);
    return {};
  }

  decideCase(caseId: string, decision: 'include' | 'backlog' | 'base' | 'monitor' | 'not-required'): void {
    const failureCase = this.caseById(caseId);
    if (!failureCase) return;
    const nextOrder = Math.max(0, ...this.selectedCases().map((entry) => entry.sttOrder ?? 0)) + 1;
    const decisions: Record<typeof decision, Partial<FailureCase>> = {
      include: { partOfPlan: 'Yes', sttOrder: failureCase.sttOrder ?? nextOrder, sttReadiness: 'Ready', workStatus: 'Selected current STT', deferredReason: '' },
      backlog: { partOfPlan: 'No', sttOrder: null, workStatus: 'Backlog', deferredReason: failureCase.deferredReason || 'No seleccionado para la ventana STT actual.' },
      base: { partOfPlan: 'No', sttOrder: null, plannedAction: 'Send to Base', workStatus: 'Deferred', sttReadiness: 'Exceeds STT window', deferredReason: failureCase.deferredReason || 'Recuperación fuera de la ventana STT.' },
      monitor: { partOfPlan: 'No', sttOrder: null, plannedAction: 'Monitor Next Stage', workStatus: 'Backlog', sttReadiness: 'Not required', deferredReason: failureCase.deferredReason || 'Monitorear en la próxima etapa.' },
      'not-required': { partOfPlan: 'No', sttOrder: null, plannedAction: 'Stay Online', workStatus: 'Not required', sttReadiness: 'Not required', deferredReason: '' },
    };
    this.updateCaseUnchecked(caseId, decisions[decision]);
  }

  confirmPlan(): void {
    this.appendCapture('STT plan confirmation');
  }

  startWork(caseId: string): void {
    const now = new Date().toISOString();
    this.updateCaseUnchecked(caseId, { workStatus: 'In progress', workStartAt: now, workEndAt: null, actualMinutes: null });
  }

  finishWork(caseId: string, actualAction: string, confirmedFailureReason: string, resolutionOutcome: string, returnToService: boolean, technicalValidationConfirmed: boolean): CaseValidationErrors {
    const current = this.caseById(caseId);
    if (!current) return { caseId: 'No se encontró el caso.' };
    const now = new Date().toISOString();
    const terminal = ['Returned to service', 'Replaced', 'No fault found', 'Not applicable'].includes(resolutionOutcome);
    const resolved = resolutionOutcome === 'Replaced' || (terminal && returnToService);
    const candidate = applyCaseChanges(current, {
      workStatus: resolved ? 'Completed' : resolutionOutcome === 'Deferred' ? 'Deferred' : 'Backlog',
      workEndAt: now,
      actualAction,
      confirmedFailureReason,
      diagnosisStatus: confirmedFailureReason ? 'Confirmed' : current.diagnosisStatus,
      resolutionOutcome,
      returnToServiceAt: returnToService ? now : null,
      closedAt: resolved ? now : null,
      technicalValidationConfirmedAt: technicalValidationConfirmed ? now : current.technicalValidationConfirmedAt,
    }, now);
    const errors = validateFailureCase(candidate, this.state().pumps);
    if (Object.values(errors).some(Boolean)) return errors;
    this.update((state) => {
      const affected = state.pumps.find((pump) => pump.sap === candidate.affectedPumpId);
      const replacementPosition = Math.max(0, ...state.pumps.filter((pump) => pump.side === 'bench' && pump.sap !== candidate.replacementPumpId).map((pump) => pump.position)) + 1;
      return {
        ...state,
        failureCases: state.failureCases.map((entry) => entry.caseId === caseId ? candidate : entry),
        pumps: state.pumps.map((pump) => {
          if (resolutionOutcome === 'Replaced' && affected && pump.sap === candidate.affectedPumpId) {
            return { ...pump, side: 'bench', manifoldId: null, connection: 'none', position: replacementPosition, row: replacementPosition - 1, currentStatus: 'Rigged Out - Not Working' };
          }
          if (resolutionOutcome === 'Replaced' && affected && pump.sap === candidate.replacementPumpId) {
            return { ...pump, side: affected.side, manifoldId: affected.manifoldId, connection: affected.connection, position: affected.position, row: affected.row, currentStatus: 'Rigged In - Working', conditionClass: 'Healthy / Available' };
          }
          if (pump.sap === candidate.affectedPumpId && returnToService) {
            return { ...pump, currentStatus: pump.side === 'bench' ? 'Rigged Out - Working' : 'Rigged In - Working', conditionClass: 'Healthy / Available' };
          }
          return pump;
        }),
      };
    });
    return {};
  }

  completeStt(): void {
    this.appendCapture('STT completion');
  }

  appendCapture(moment: CaptureMoment = 'Manual'): void {
    const now = new Date().toISOString();
    this.update((state) => {
      const capture = createOperationalCapture(state, moment, now);
      return { ...state, captures: [...state.captures, capture], captureSequence: state.captureSequence + 1 };
    });
  }

  closeStage(): void {
    if (this.state().stage.status === 'closed') return;
    const now = new Date().toISOString();
    this.update((state) => {
      const capture = createOperationalCapture(state, 'Stage close', now);
      return {
        ...state,
        stage: { ...state.stage, status: 'closed', closedAt: now },
        captures: [...state.captures, capture],
        captureSequence: state.captureSequence + 1,
      };
    });
  }

  loadPrimeDemo(): void {
    this.state.set(this.repository.loadPrimeDemo());
  }

  caseById(caseId: string): FailureCase | null {
    return this.state().failureCases.find((entry) => entry.caseId === caseId) ?? null;
  }

  pumpBySap(pumpId: string): Pump | null {
    return this.state().pumps.find((entry) => entry.sap === pumpId) ?? null;
  }

  slotPump(target: SlotTarget): Pump | null {
    return this.state().pumps.find((pump) => pump.manifoldId === target.manifoldId && pump.side === target.side && pump.position === target.position) ?? null;
  }

  placePump(pumpId: string, target: SlotTarget): void {
    const manifold = this.state().manifolds.find((entry) => entry.id === target.manifoldId);
    if (!manifold || target.position > manifold.pumpsPerSide) return;
    this.update((state) => {
      const occupied = state.pumps.find((pump) => pump.manifoldId === target.manifoldId && pump.side === target.side && pump.position === target.position && pump.id !== pumpId);
      return {
        ...state,
        pumps: state.pumps.map((pump) => {
          if (pump.id === pumpId) return { ...pump, manifoldId: target.manifoldId, side: target.side, position: target.position, row: target.position - 1, connection: manifold.type, currentStatus: pump.currentStatus.replace('Rigged Out', 'Rigged In') };
          if (occupied && pump.id === occupied.id) return { ...pump, manifoldId: null, side: 'bench', connection: 'none', currentStatus: pump.currentStatus.replace('Rigged In', 'Rigged Out') };
          return pump;
        }),
      };
    });
  }

  movePumpToBench(pumpId: string): void {
    this.update((state) => {
      const nextPosition = state.pumps.filter((pump) => pump.side === 'bench').length + 1;
      return { ...state, pumps: state.pumps.map((pump) => pump.id === pumpId ? { ...pump, manifoldId: null, side: 'bench', connection: 'none', position: nextPosition, row: nextPosition - 1, currentStatus: pump.currentStatus.replace('Rigged In', 'Rigged Out') } : pump) };
    });
  }

  updateManifold(manifold: Manifold): void {
    this.update((state) => ({ ...state, manifolds: state.manifolds.map((entry) => entry.id === manifold.id ? { ...manifold } : entry) }));
  }

  setActuator(target: SlotTarget, value: string): void {
    const key = `${target.manifoldId}:${target.side}:${target.position}`;
    this.update((state) => ({ ...state, slotActuators: { ...state.slotActuators, [key]: value.replace(/\D/g, '').slice(0, 3) } }));
  }

  private updateCaseUnchecked(caseId: string, changes: Partial<FailureCase>): void {
    const now = new Date().toISOString();
    this.update((state) => ({ ...state, failureCases: state.failureCases.map((entry) => entry.caseId === caseId ? applyCaseChanges(entry, changes, now) : entry) }));
  }

  private update(updater: (state: PrimeMaintenanceState) => PrimeMaintenanceState): void {
    const next = updater(structuredClone(this.state()));
    this.state.set(next);
    this.repository.save(next);
  }
}
