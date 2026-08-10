import { inject, Injectable, InjectionToken } from '@angular/core';

import { MaintenanceState } from '../models/maintenance.models';

const STORAGE_KEY = 'luctiv-maintenance-state-v2';
const LEGACY_STORAGE_KEY = 'luctiv-maintenance-state-v1';

export const MAINTENANCE_STORAGE = new InjectionToken<Storage | null>(
  'LUCTIV maintenance storage',
  {
    providedIn: 'root',
    factory: () => (typeof localStorage === 'undefined' ? null : localStorage),
  },
);

@Injectable({ providedIn: 'root' })
export class MaintenancePersistence {
  private readonly storage = inject(MAINTENANCE_STORAGE);

  load(): unknown | null {
    if (!this.storage) {
      return null;
    }

    try {
      const savedState =
        this.storage.getItem(STORAGE_KEY) ?? this.storage.getItem(LEGACY_STORAGE_KEY);
      return savedState ? (JSON.parse(savedState) as unknown) : null;
    } catch {
      return null;
    }
  }

  save(state: MaintenanceState): string | null {
    if (!this.storage) {
      return 'El almacenamiento local no está disponible.';
    }

    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return null;
    } catch {
      return 'No se pudo guardar el cambio localmente. Exportá un backup antes de cerrar.';
    }
  }
}
