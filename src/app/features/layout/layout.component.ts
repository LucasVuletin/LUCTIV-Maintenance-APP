import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeMaintenanceStore } from '../../core/services/prime-maintenance.store';
import { Manifold, Pump, SlotTarget } from '../../core/models/prime.models';

@Component({ selector: 'app-layout', imports: [FormsModule, NgTemplateOutlet], templateUrl: './layout.component.html', styleUrl: './layout.component.scss' })
export class LayoutComponent {
  protected readonly store = inject(PrimeMaintenanceStore);
  protected readonly draggedPumpId = signal<string | null>(null);
  protected benchCount(): number { return this.store.state().pumps.filter((pump) => pump.side === 'bench').length; }
  protected positions(count: number): number[] { return Array.from({ length: count }, (_, index) => index + 1); }
  protected slotPump(target: SlotTarget): Pump | null { return this.store.slotPump(target); }
  protected actuator(target: SlotTarget): string { return this.store.state().slotActuators[`${target.manifoldId}:${target.side}:${target.position}`] ?? ''; }
  protected beginDrag(pumpId: string, event: DragEvent): void { this.draggedPumpId.set(pumpId); event.dataTransfer?.setData('text/plain', pumpId); }
  protected drop(target: SlotTarget, event: DragEvent): void { event.preventDefault(); const pumpId = event.dataTransfer?.getData('text/plain') || this.draggedPumpId(); if (pumpId) this.store.placePump(pumpId, target); this.draggedPumpId.set(null); }
  protected dropBench(event: DragEvent): void { event.preventDefault(); const pumpId = event.dataTransfer?.getData('text/plain') || this.draggedPumpId(); if (pumpId) this.store.movePumpToBench(pumpId); this.draggedPumpId.set(null); }
  protected saveManifold(manifold: Manifold): void { const count = Math.max(1, Math.min(12, Math.round(manifold.pumpsPerSide))); this.store.updateManifold({ ...manifold, pumpsPerSide: count }); }
}
