<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { OnboardingStatus } from '@/types';
import * as usersService from '@/services/usersService';
import { extractApiError } from '@/services/api';

const emit = defineEmits<{
  updated: [status: OnboardingStatus];
}>();

const { t } = useI18n();
const router = useRouter();

const status = ref<OnboardingStatus | null>(null);
const loading = ref(true);
const errorKey = ref<string | null>(null);

async function loadStatus(): Promise<void> {
  loading.value = true;
  errorKey.value = null;
  try {
    status.value = await usersService.fetchOnboardingStatus();
    emit('updated', status.value);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

async function dismiss(): Promise<void> {
  errorKey.value = null;
  try {
    status.value = await usersService.dismissOnboarding();
    emit('updated', status.value);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function goTo(path: string): void {
  void router.push(path);
}

onMounted(() => {
  void loadStatus();
});

defineExpose({ reload: loadStatus });
</script>

<template>
  <div v-if="!loading && status && !status.dismissed && !status.completed" class="card onboarding-checklist">
    <div class="checklist-header">
      <div>
        <h2>{{ t('onboarding.title') }}</h2>
        <p>{{ t('onboarding.subtitle') }}</p>
      </div>
      <button type="button" class="btn btn-ghost" @click="dismiss">
        {{ t('onboarding.dismiss') }}
      </button>
    </div>

    <p v-if="errorKey" class="error">{{ t(errorKey) }}</p>

    <ul class="checklist">
      <li :class="{ done: status.steps.createFirstItem }">
        <span class="check">{{ status.steps.createFirstItem ? '✓' : '○' }}</span>
        <div class="step-body">
          <span>{{ t('onboarding.step1') }}</span>
          <button
            v-if="!status.steps.createFirstItem"
            type="button"
            class="btn btn-secondary btn-sm"
            @click="goTo('/items')"
          >
            {{ t('onboarding.createItem') }}
          </button>
        </div>
      </li>
      <li :class="{ done: status.steps.inviteColleague }">
        <span class="check">{{ status.steps.inviteColleague ? '✓' : '○' }}</span>
        <div class="step-body">
          <span>{{ t('onboarding.step2') }}</span>
          <button
            v-if="!status.steps.inviteColleague"
            type="button"
            class="btn btn-secondary btn-sm"
            @click="goTo('/users')"
          >
            {{ t('onboarding.inviteUsers') }}
          </button>
        </div>
      </li>
      <li :class="{ done: status.steps.setLanguage }">
        <span class="check">{{ status.steps.setLanguage ? '✓' : '○' }}</span>
        <div class="step-body">
          <span>{{ t('onboarding.stepLanguage') }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.onboarding-checklist {
  margin-bottom: 1.5rem;
}

.checklist-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.checklist-header h2 {
  margin-bottom: 0.35rem;
}

.checklist-header p {
  color: var(--text-muted);
}

.checklist {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checklist li {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.checklist li.done {
  border-color: color-mix(in srgb, var(--success) 40%, var(--border));
  background: color-mix(in srgb, var(--success) 8%, var(--surface));
}

.check {
  font-weight: 700;
  color: var(--primary);
  min-width: 1rem;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.btn-sm {
  align-self: flex-start;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
}

.error {
  color: var(--danger);
  margin-bottom: 0.75rem;
}
</style>
