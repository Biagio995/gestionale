<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import * as authService from '@/services/authService';
import { extractApiError } from '@/services/api';

const { t } = useI18n();

const form = reactive({ email: '' });
const errorKey = ref<string | null>(null);
const sent = ref(false);
const loading = ref(false);

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  loading.value = true;
  try {
    await authService.forgotPassword(form.email);
    sent.value = true;
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppLayout>
    <main class="auth-page">
      <form v-if="!sent" class="auth-card" @submit.prevent="onSubmit">
        <h1>{{ t('auth.forgotTitle') }}</h1>
        <p class="subtitle">{{ t('auth.forgotSubtitle') }}</p>

        <p v-if="errorKey" class="error">{{ t(errorKey) }}</p>

        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="form.email" type="email" required autocomplete="email" />
        </label>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ t('auth.forgotSubmit') }}
        </button>

        <p class="footer-link">
          <RouterLink to="/login">{{ t('auth.goLogin') }}</RouterLink>
        </p>
      </form>

      <div v-else class="auth-card">
        <h1>{{ t('auth.forgotSentTitle') }}</h1>
        <p class="subtitle">{{ t('auth.forgotSentSubtitle') }}</p>
        <RouterLink to="/login" class="btn btn-primary">{{ t('auth.goLogin') }}</RouterLink>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 65px);
  padding: 2rem;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.error {
  color: var(--danger);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
}

input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}

.footer-link {
  text-align: center;
  font-size: 0.875rem;
}
</style>
