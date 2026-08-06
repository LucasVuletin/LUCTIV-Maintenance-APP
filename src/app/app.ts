import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Manifold,
  Pump,
  SetNumber,
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
  protected readonly sets: SetNumber[] = [1, 2, 3, 4, 5, 6];

  protected stageDraft: StageContext = {
    ...this.store.state().stageContext,
  };

  protected pumpsForManifold(manifold: Manifold): Pump[] {
    return this.store
      .state()
      .pumps.filter((pump) => pump.manifoldId === manifold.id)
      .sort((left, right) => left.position - right.position);
  }

  protected reservePumps(): Pump[] {
    return this.store
      .state()
      .pumps.filter((pump) => pump.side === 'reserve')
      .sort((left, right) => left.position - right.position);
  }

  protected saveStage(): void {
    this.store.updateStageContext({ ...this.stageDraft });
  }

  protected resetWorkspace(): void {
    if (window.confirm('¿Restablecer el ejemplo y borrar los datos locales?')) {
      this.store.reset();
      this.stageDraft = { ...this.store.state().stageContext };
    }
  }
}
