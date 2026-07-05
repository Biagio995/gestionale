<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import type { Language } from '@/types';
import * as authService from '@/services/authService';
import { extractApiError } from '@/services/api';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const token = String(route.query.token ?? '');
const preview = ref<{ email: string; tenantName: string; role: string } | null>(null);
const loading = ref(true);
const errorKey = ref<string | null>(null);

const form = reactive({
  password: '',
});

onMounted(async () => {
  if (!token) {
    errorKey.value = 'errors.invitationInvalid';
    loading.value = false;
    return;
  }
  try {
    const data = await authService.fetchInvitationPreview(token);
    preview.value = {
      email: data.email,
      tenantName: data.tenantName,
      role: data.role,
    };
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
});

async function onSubmit(): Promise<void> {
  errorKey.value = null;
  try {
    await auth.acceptInvitation({
      token,
      password: form.password,
      language: locale.value as Language,
    });
    router.push({ name: 'dashboard' });
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}
</script>

<template>
  <AppLayout>
    <main class="auth-page">
      <div v-if="loading" class="auth-card">{{ t('app.loading') }}</div>

      <form v-else-if="preview" class="auth-card" @submit.prevent="onSubmit">
        <h1>{{ t('auth.acceptInviteTitle') }}</h1>
        <p class="subtitle">
          {{ t('auth.acceptInviteSubtitle', { tenant: preview.tenantName, email: preview.email }) }}
        </p>

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

        <button type="submit" class="btn btn-primary">
          {{ t('auth.acceptInviteSubmit') }}
        </button>
      </form>

      <div v-else class="auth-card">
        <p class="error">{{ t(errorKey ?? 'errors.invitationInvalid') }}</p>
        <RouterLink to="/login">{{ t('auth.goLogin') }}</RouterLink>
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
