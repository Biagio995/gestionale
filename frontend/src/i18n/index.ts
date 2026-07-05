import { createI18n } from 'vue-i18n';
import type { Language } from '@/types';
import el from './locales/el.json';
import en from './locales/en.json';
import it from './locales/it.json';

const SUPPORTED_LOCALES: Language[] = ['it', 'en', 'el'];
const missingKeysLogged = new Set<string>();

function resolveBrowserLocale(): Language {
  const browser = navigator.language.slice(0, 2);
  if (SUPPORTED_LOCALES.includes(browser as Language)) {
    return browser as Language;
  }
  return 'en';
}

export function createAppI18n(userLanguage?: Language | null): ReturnType<typeof createI18n> {
  const locale = userLanguage ?? resolveBrowserLocale();

  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { it, en, el },
    missingWarn: false,
    fallbackWarn: false,
    missing: (activeLocale, key) => {
      const missId = `${String(activeLocale)}:${key}`;
      if (!missingKeysLogged.has(missId)) {
        missingKeysLogged.add(missId);
        console.warn('[i18n] missing translation key', { locale: activeLocale, key });
      }
      const fallback = getNestedValue(en as Record<string, unknown>, key);
      return typeof fallback === 'string' ? fallback : '';
    },
  });
}

export { SUPPORTED_LOCALES };

function getNestedValue(
  source: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[part];
  }, source);
}
