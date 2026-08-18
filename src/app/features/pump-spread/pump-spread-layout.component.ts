import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { PumpCommentChangeEvent, PumpConnectorChangeEvent, PumpDataView, PumpPosition, PumpSpreadDropEvent, PumpSpreadLayout, PumpStatus, PumpStatusChangeEvent } from '../../core/models/pump-spread.model';
import { TechnicalI18nService } from '../../core/services/technical-i18n.service';

interface SpreadRow {
  readonly index: number;
  readonly left: PumpPosition;
  readonly right: PumpPosition;
}

@Component({
  selector: 'app-pump-spread-layout',
  standalone: true,
  imports: [DecimalPipe, NgTemplateOutlet],
  templateUrl: './pump-spread-layout.component.html',
  styleUrl: './pump-spread-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PumpSpreadLayoutComponent {
  protected readonly i18n = inject(TechnicalI18nService);
  readonly layout = input.required<PumpSpreadLayout>();
  readonly dataView = input<PumpDataView>('operation');
  readonly selectedPumpId = input<string | null>(null);
  readonly pumpSelected = output<PumpPosition>();
  readonly pumpDropped = output<PumpSpreadDropEvent>();
  readonly connectorChanged = output<PumpConnectorChangeEvent>();
  readonly statusChanged = output<PumpStatusChangeEvent>();
  readonly commentChanged = output<PumpCommentChangeEvent>();
  readonly emptySlotSelected = output<string>();
  protected readonly openStatusPump = signal<string | null>(null);
  protected readonly statuses: readonly PumpStatus[] = ['running', 'available', 'warning', 'down', 'maintenance', 'offline'];

  protected readonly rows = computed<readonly SpreadRow[]>(() => {
    const layout = this.layout();
    const rowCount = Math.max(layout.left.pumps.length, layout.right.pumps.length, 1);
    return Array.from({ length: rowCount }, (_, index) => ({
      index,
      left: layout.left.pumps[index] ?? this.emptyPosition(layout.manifoldId, 'left', index + 1),
      right: layout.right.pumps[index] ?? this.emptyPosition(layout.manifoldId, 'right', index + 1),
    }));
  });

  protected statusLabel(status: PumpStatus): string {
    return this.i18n.ui(`status.${status}`);
  }

  protected selectPump(pump: PumpPosition): void {
    if (pump.pumpNumber) this.pumpSelected.emit(pump);
  }

  protected beginDrag(pump: PumpPosition, event: DragEvent): void {
    if (!pump.pumpNumber) return;
    event.dataTransfer?.setData('text/plain', pump.pumpNumber);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  protected dropPump(slotId: string, event: DragEvent): void {
    event.preventDefault();
    const pumpNumber = event.dataTransfer?.getData('text/plain');
    if (pumpNumber) this.pumpDropped.emit({ slotId, pumpNumber });
  }

  protected updateConnector(slotId: string, event: Event): void {
    this.connectorChanged.emit({ slotId, connectorLabel: (event.target as HTMLInputElement).value });
  }

  protected toggleStatus(pumpNumber: string, event: Event): void {
    event.stopPropagation();
    this.openStatusPump.update((current) => current === pumpNumber ? null : pumpNumber);
  }

  protected chooseStatus(pumpNumber: string, status: PumpStatus, event: Event): void {
    event.stopPropagation();
    this.statusChanged.emit({ pumpNumber, status });
    this.openStatusPump.set(null);
  }

  protected updateComment(pumpNumber: string, event: Event): void {
    this.commentChanged.emit({ pumpNumber, comment: (event.target as HTMLInputElement).value });
  }

  protected addAtSlot(slotId: string): void {
    this.emptySlotSelected.emit(slotId);
  }

  protected signalColumns(count: 3 | 5): readonly number[] {
    return Array.from({ length: count }, (_, index) => index);
  }

  protected signalValue(pump: PumpPosition, row: string): number {
    if (row === 'P') return pump.hoursP;
    if (row === 'D') return pump.hoursD;
    return pump.hoursS;
  }

  private emptyPosition(manifoldId: string, side: 'left' | 'right', position: number): PumpPosition {
    return {
      slotId: `${manifoldId}:${side}:${position}`,
      operationalId: null,
      pumpNumber: null,
      rateBpm: null,
      gear: null,
      rpm: null,
      connectorLabel: '',
      status: 'offline',
      isDgb: false,
      dgbSubstitutionPercentage: 0,
      supervisorComment: '',
      pumpModel: 'HT200',
      signalColumnCount: 3,
      hoursP: 0,
      hoursD: 0,
      hoursS: 0,
    };
  }
}
