import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  DomainActionResult,
  Manifold,
  OperationalEvent,
  Pump,
  SetNumber,
  SET_NUMBERS,
  StageContext,
} from './core/models/maintenance.models';
import { LayoutStore } from './core/services/layout-store.service';

@Component({
  selector: 'app-root',
  imports: [DatePipe, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly store = inject(LayoutStore);
  protected readonly sets: SetNumber[] = SET_NUMBERS;

  protected stageDraft: StageContext = {
    ...this.store.state().stageContext,
  };
  protected replacementSelections: Record<string, string> = {};
  protected responseComments: Record<string, string> = {};
  protected actionNotice: string | null = null;

  protected pumpsForManifold(manifold: Manifold): Pump[] {
    return this.store
      .currentPumps()
      .filter((pump) => pump.manifoldId === manifold.id)
      .sort((left, right) => left.position - right.position);
  }

  protected reservePumps(): Pump[] {
    return this.store
      .currentPumps()
      .filter((pump) => pump.side === 'reserve')
      .sort((left, right) => left.position - right.position);
  }

  protected saveStage(): void {
    this.handleResult(
      this.store.updateStageContext({ ...this.stageDraft }),
      'Contexto operativo guardado.',
    );
  }

  protected selectSet(setNumber: SetNumber): void {
    this.handleResult(this.store.setSelectedSet(setNumber), `SET ${setNumber} activo.`);
  }

  protected reportFailure(pump: Pump): void {
    const reason = window.prompt(`Motivo por el que ${pump.sap} queda OFFLINE:`, 'Falla operativa');
    if (reason !== null) {
      this.handleResult(this.store.markPumpOffline(pump.id, reason));
    }
  }

  protected simulateFailure(): void {
    this.handleResult(this.store.simulateFailure());
  }

  protected selectedReplacementId(event: OperationalEvent): string {
    return this.replacementSelections[event.id] ?? event.recommendedReplacementPumpId ?? '';
  }

  protected setReplacementSelection(eventId: string, pumpId: string): void {
    this.replacementSelections = {
      ...this.replacementSelections,
      [eventId]: pumpId,
    };
  }

  protected responseComment(eventId: string): string {
    return this.responseComments[eventId] ?? '';
  }

  protected setResponseComment(eventId: string, comment: string): void {
    this.responseComments = {
      ...this.responseComments,
      [eventId]: comment,
    };
  }

  protected confirmReplacement(event: OperationalEvent): void {
    const result = this.store.resolveOperationalEvent(
      event.id,
      'replaced',
      this.selectedReplacementId(event) || null,
      this.responseComment(event.id),
    );
    this.handleResult(result, 'Reemplazo ejecutado y mantenimiento generado.');
  }

  protected rejectReplacement(event: OperationalEvent): void {
    const result = this.store.resolveOperationalEvent(
      event.id,
      'not-possible',
      null,
      this.responseComment(event.id),
    );
    this.handleResult(result, 'Decisión registrada y reserva liberada.');
  }

  protected completeTask(taskId: string): void {
    this.handleResult(
      this.store.completeTask(taskId),
      'MTTO completado; bomba habilitada y trazabilidad actualizada.',
    );
  }

  protected async importSnapshot(domEvent: Event): Promise<void> {
    const input = domEvent.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const result = this.store.importSnapshot(await file.text());
    if (result.ok) {
      this.stageDraft = { ...this.store.state().stageContext };
    }
    this.handleResult(result, 'Backup importado y validado.');
    input.value = '';
  }

  protected resetWorkspace(): void {
    if (window.confirm('¿Restablecer el ejemplo y borrar los datos locales?')) {
      const result = this.store.reset();
      if (result.ok) {
        this.stageDraft = { ...this.store.state().stageContext };
      }
      this.handleResult(result, 'Workspace restablecido.');
    }
  }

  private handleResult(result: DomainActionResult, successMessage?: string): void {
    this.actionNotice = result.ok ? (successMessage ?? null) : null;
  }
}
