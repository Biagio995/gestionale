<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <AppLayout>
    <main class="guest-page">
      <div class="guest-card">
        <h1>{{ t('guest.title') }}</h1>
        <p>{{ t('guest.subtitle') }}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" @click="router.push('/login')">
            {{ t('guest.login') }}
          </button>
          <button type="button" class="btn btn-secondary" @click="router.push('/register')">
            {{ t('guest.register') }}
          </button>
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.guest-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 65px);
  padding: 2rem;
}

.guest-card {
  text-align: center;
  max-width: 420px;
}

.guest-card h1 {
  margin-bottom: 0.75rem;
}

.guest-card p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style>
