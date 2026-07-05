<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Language } from '@/types';
import { SUPPORTED_LOCALES } from '@/i18n';
import { useAuthStore } from '@/stores/auth';

const { t, locale } = useI18n();
const auth = useAuthStore();

async function onChange(event: Event): Promise<void> {
  const target = event.target as HTMLSelectElement;
  const lang = target.value as Language;
  if (!SUPPORTED_LOCALES.includes(lang)) return;

  locale.value = lang;

  if (auth.isAuthenticated) {
    await auth.changeLanguage(lang);
  }
}
</script>

<template>
  <label class="lang-switcher">
    <span>{{ t('language.label') }}</span>
    <select :value="locale" @change="onChange">
      <option value="it">{{ t('language.it') }}</option>
      <option value="en">{{ t('language.en') }}</option>
      <option value="el">{{ t('language.el') }}</option>
    </select>
  </label>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

select {
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
</style>
