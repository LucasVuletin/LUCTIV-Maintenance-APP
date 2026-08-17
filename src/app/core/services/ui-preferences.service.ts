import { Injectable, signal } from '@angular/core';

const HEADER_COLLAPSED_KEY = 'luctiv-ui-header-collapsed';

@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  readonly headerCollapsed = signal(localStorage.getItem(HEADER_COLLAPSED_KEY) !== 'false');

  toggleHeader(): void {
    this.setHeaderCollapsed(!this.headerCollapsed());
  }

  setHeaderCollapsed(collapsed: boolean): void {
    this.headerCollapsed.set(collapsed);
    localStorage.setItem(HEADER_COLLAPSED_KEY, String(collapsed));
  }
}
