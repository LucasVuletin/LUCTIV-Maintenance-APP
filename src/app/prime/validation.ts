import { CaseValidationErrors, FailureCase, Pump } from '../core/models/prime.models';
import { isCatalogValue } from './catalogs';

export function validateFailureCase(failureCase: FailureCase, pumps: readonly Pump[]): CaseValidationErrors {
  const errors: CaseValidationErrors = {};
  if (!failureCase.caseId) errors.caseId = 'CaseId es obligatorio.';
  if (!failureCase.firstDetectedAt) errors.firstDetectedAt = 'La fecha de detección es obligatoria.';
  if (!isCatalogValue('FailureReason', failureCase.failureReason)) errors.failureReason = 'Selecciona un motivo del catálogo PRIME.';
  if (failureCase.diagnosisStatus === 'Confirmed' && !failureCase.failureEvidence.trim()) errors.failureEvidence = 'Registra evidencia antes de confirmar el diagnóstico.';
  if (failureCase.partOfPlan === 'Yes') {
    if (!failureCase.sttOrder || failureCase.sttOrder < 1) errors.sttOrder = 'El orden STT es obligatorio para trabajo seleccionado.';
    if (!failureCase.responsibleGroup) errors.responsibleGroup = 'Asigna un grupo responsable.';
    if (!failureCase.plannedAction) errors.plannedAction = 'Define la acción planificada.';
    if (failureCase.minutesToRecovery === null) errors.minutesToRecovery = 'Indica el tiempo estimado.';
    if (!failureCase.taskDescription.trim()) errors.taskDescription = 'Describe el trabajo a ejecutar.';
  }
  if (failureCase.partOfPlan === 'No' && ['Backlog', 'Deferred'].includes(failureCase.workStatus) && !failureCase.deferredReason.trim()) {
    errors.deferredReason = 'Indica por qué el caso queda fuera del STT actual.';
  }
  if (failureCase.minutesToRecovery !== null && (!Number.isInteger(failureCase.minutesToRecovery) || failureCase.minutesToRecovery < 0)) {
    errors.minutesToRecovery = 'El tiempo debe ser un número entero no negativo.';
  }
  if (failureCase.workStatus === 'In progress' && !failureCase.workStartAt) errors.workStartAt = 'Inicia el reloj antes de marcar el trabajo en curso.';
  if (failureCase.workStartAt && failureCase.workEndAt && Date.parse(failureCase.workEndAt) < Date.parse(failureCase.workStartAt)) {
    errors.workEndAt = 'La finalización no puede ser anterior al inicio.';
  }
  if (failureCase.workStatus === 'Completed' && !failureCase.actualAction.trim()) errors.actualAction = 'Registra la acción ejecutada.';
  if (failureCase.diagnosisStatus === 'Confirmed' && failureCase.workEndAt && !failureCase.confirmedFailureReason.trim()) {
    errors.confirmedFailureReason = 'Confirma la causa raíz después de la intervención.';
  }
  if (failureCase.ruleStatus === 'Draft - technical validation required' && failureCase.confirmedFailureReason && !failureCase.technicalValidationConfirmedAt) {
    errors.confirmedFailureReason = 'Confirma la validación técnica humana para una regla Draft.';
  }
  if (failureCase.workStatus === 'Completed' && !failureCase.resolutionOutcome) errors.resolutionOutcome = 'Selecciona el resultado de la intervención.';
  if (failureCase.returnToServiceAt && failureCase.workEndAt && Date.parse(failureCase.returnToServiceAt) < Date.parse(failureCase.workEndAt)) {
    errors.returnToServiceAt = 'El retorno a servicio no puede ser anterior al fin del trabajo.';
  }
  if (failureCase.replacementPumpId === failureCase.affectedPumpId) errors.replacementPumpId = 'La bomba de reemplazo debe ser diferente.';
  if (failureCase.replacementPumpId) {
    const replacement = pumps.find((pump) => pump.sap === failureCase.replacementPumpId);
    if (!replacement) errors.replacementPumpId = 'La bomba de reemplazo no existe en el spread.';
    else if (!['Rigged Out - Working', 'Ready'].includes(replacement.currentStatus)) errors.replacementPumpId = 'La bomba seleccionada no figura disponible.';
  }
  return errors;
}

export function hasValidationErrors(errors: CaseValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
