import { PrimeMaintenanceState } from '../models/prime.models';

export function validatePrimeState(state: PrimeMaintenanceState): string[] {
  const errors: string[] = [];
  const pumpIds = state.pumps.map((pump) => pump.id);
  const pumpNumbers = state.pumps.map((pump) => pump.sap);
  const caseIds = state.failureCases.map((failureCase) => failureCase.caseId);
  const captureIds = state.captures.map((capture) => capture.captureId);
  if (new Set(pumpIds).size !== pumpIds.length) errors.push('Hay identificadores de bomba duplicados.');
  if (new Set(pumpNumbers).size !== pumpNumbers.length) errors.push('Hay números de bomba duplicados.');
  if (new Set(caseIds).size !== caseIds.length) errors.push('Hay CaseId duplicados.');
  if (new Set(captureIds).size !== captureIds.length) errors.push('Hay CaptureId duplicados.');
  const occupiedSlots = state.pumps.filter((pump) => pump.side !== 'bench').map((pump) => `${pump.manifoldId}:${pump.side}:${pump.position}`);
  if (new Set(occupiedSlots).size !== occupiedSlots.length) errors.push('Hay más de una bomba asignada a la misma posición.');
  for (const failureCase of state.failureCases) {
    if (!state.pumps.some((pump) => pump.sap === failureCase.affectedPumpId)) errors.push(`${failureCase.caseId} referencia una bomba inexistente.`);
    if (failureCase.replacementPumpId === failureCase.affectedPumpId) errors.push(`${failureCase.caseId} usa la misma bomba como reemplazo.`);
    if (failureCase.replacementPumpId && !state.pumps.some((pump) => pump.sap === failureCase.replacementPumpId)) errors.push(`${failureCase.caseId} referencia un reemplazo inexistente.`);
  }
  for (const capture of state.captures) {
    if (capture.rows.some((row) => row.CaptureId !== capture.captureId)) errors.push(`${capture.captureId} contiene filas de otra captura.`);
  }
  return errors;
}
