<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import * as authService from '@/services/authService';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const token = String(route.query.token ?? '');
const errorKey = ref<string | null>(null);
const loading = ref(false);
const done = ref(false);

const form = reactive({ password: '' });

onMounted(() => {
  if (!token) {
    errorKey.value = 'errors.resetTokenInvalid';
  }
});

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  loading.value = true;
  try {
    await authService.resetPassword({ token, password: form.password });
    done.value = true;
    setTimeout(() => router.push({ name: 'login' }), 2000);
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
      <form v-if="!done && token" class="auth-card" @submit.prevent="onSubmit">
        <h1>{{ t('auth.resetTitle') }}</h1>
        <p class="subtitle">{{ t('auth.resetSubtitle') }}</p>

        <p v-if="errorKey" class="error">{{ t(errorKey) }}</p>

        <label>
          <span>{{ t('auth.password') }}</span>
          <input
            v-model="form.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </label>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ t('auth.resetSubmit') }}
        </button>
      </form>

      <div v-else-if="done" class="auth-card">
        <h1>{{ t('auth.resetDoneTitle') }}</h1>
        <p class="subtitle">{{ t('auth.resetDoneSubtitle') }}</p>
      </div>

      <div v-else class="auth-card">
        <p class="error">{{ t(errorKey ?? 'errors.resetTokenInvalid') }}</p>
        <RouterLink to="/forgot-password">{{ t('auth.forgotSubmit') }}</RouterLink>
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
</style>
