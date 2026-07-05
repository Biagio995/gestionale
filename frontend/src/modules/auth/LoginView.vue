<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const sessionExpired = computed(() => route.query.session === 'expired');

const form = reactive({
  email: '',
  password: '',
});

async function onSubmit(): Promise<void> {
  try {
    await auth.login({ email: form.email, password: form.password });
    router.push({ name: auth.isSuperAdmin ? 'admin' : 'dashboard' });
  } catch {
    /* error shown via auth.errorKey */
  }
}
</script>

<template>
  <AppLayout>
    <main class="auth-page">
      <form class="auth-card" @submit.prevent="onSubmit">
        <h1>{{ t('auth.loginTitle') }}</h1>

        <p v-if="sessionExpired" class="notice">{{ t('auth.sessionExpired') }}</p>
        <p v-else-if="auth.errorKey" class="error">{{ t(auth.errorKey) }}</p>

        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="form.email" type="email" required autocomplete="email" />
        </label>

        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="form.password" type="password" required autocomplete="current-password" />
        </label>

        <button type="submit" class="btn btn-primary" :disabled="auth.loading">
          {{ t('auth.submitLogin') }}
        </button>

        <p class="footer-link">
          <RouterLink to="/forgot-password">{{ t('auth.forgotLink') }}</RouterLink>
        </p>

        <p class="footer-link">
          {{ t('auth.noAccount') }}
          <RouterLink to="/register">{{ t('auth.goRegister') }}</RouterLink>
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

.notice {
  color: var(--warning, #b45309);
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--warning, #b45309) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--warning, #b45309) 35%, var(--border));
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
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
