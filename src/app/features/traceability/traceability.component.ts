import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PrimeExportService } from '../../core/services/prime-export.service';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';

@Component({ selector: 'app-traceability', imports: [DatePipe], templateUrl: './traceability.component.html', styleUrl: './traceability.component.scss' })
export class TraceabilityComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  private readonly exporter = inject(PrimeExportService);
  protected readonly selectedCaseId = signal<string | null>(null);
  protected readonly notice = signal('');
  protected capturesNewestFirst() { return [...this.store.state().captures].reverse(); }
  protected async exportPrime(): Promise<void> { const filename = await this.exporter.exportStage(this.store.state()); this.notice.set(`Exportado: ${filename}`); }
  protected closeStage(): void { if (!window.confirm('¿Cerrar la etapa y crear la captura final? Los casos abiertos conservarán su CaseId.')) return; this.store.closeStage(); this.notice.set('Etapa cerrada y captura final registrada.'); }
}
