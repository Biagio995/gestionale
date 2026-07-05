<script setup lang="ts">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import type { Language } from '@/types';

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  email: '',
  password: '',
  tenantName: '',
});

async function onSubmit(): Promise<void> {
  try {
    await auth.register({
      email: form.email,
      password: form.password,
      tenantName: form.tenantName,
      language: locale.value as Language,
    });
    router.push({ name: 'dashboard' });
  } catch {
    /* error shown via auth.errorKey */
  }
}
</script>

<template>
  <AppLayout>
    <main class="auth-page">
      <form class="auth-card" @submit.prevent="onSubmit">
        <h1>{{ t('auth.registerTitle') }}</h1>

        <p v-if="auth.errorKey" class="error">{{ t(auth.errorKey) }}</p>

        <label>
          <span>{{ t('auth.tenantName') }}</span>
          <input v-model="form.tenantName" type="text" required minlength="2" />
        </label>

        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="form.email" type="email" required autocomplete="email" />
        </label>

        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" />
        </label>

        <button type="submit" class="btn btn-primary" :disabled="auth.loading">
          {{ t('auth.submitRegister') }}
        </button>

        <p class="footer-link">
          {{ t('auth.hasAccount') }}
          <RouterLink to="/login">{{ t('auth.goLogin') }}</RouterLink>
        </p>
      </form>
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
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.auth-card h1 {
  margin-bottom: 0.5rem;
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

.error {
  color: var(--danger);
  font-size: 0.875rem;
}

.footer-link {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.footer-link a {
  color: var(--primary);
}
</style>
