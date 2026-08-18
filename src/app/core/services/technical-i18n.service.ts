import { computed, effect, Injectable, signal } from '@angular/core';
import { AppLanguage, domainText, uiText } from '../i18n/technical-translations';

const LANGUAGE_KEY = 'luctiv-ui-language';

function initialLanguage(): AppLanguage {
  return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'es';
}
@Injectable({ providedIn: 'root' })
export class TechnicalI18nService {
  readonly language = signal<AppLanguage>(initialLanguage());
  readonly isEnglish = computed(() => this.language() === 'en');

  constructor() {
    effect(() => {
      document.documentElement.lang = this.language() === 'en' ? 'en' : 'es-AR';
    });
  }

  toggle(): void {
    this.setLanguage(this.isEnglish() ? 'es' : 'en');
  }

  setLanguage(language: AppLanguage): void {
    this.language.set(language);
    localStorage.setItem(LANGUAGE_KEY, language);
  }

  ui(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    return uiText(key, this.language(), params);
  }

  domain(value: string | null | undefined): string {
    return domainText(value, this.language());
  }
}
