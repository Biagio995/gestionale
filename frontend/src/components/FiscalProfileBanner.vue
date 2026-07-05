<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import * as fiscalService from '@/services/fiscalService';

const { t } = useI18n();
const router = useRouter();
const missing = ref(false);

onMounted(async () => {
  try {
    const profile = await fiscalService.fetchFiscalProfile();
    missing.value = !profile?.legal_name;
  } catch {
    missing.value = true;
  }
});
</script>

<template>
  <div v-if="missing" class="fiscal-banner" role="alert">
    <p>{{ t('sales.fiscalBanner.message') }}</p>
    <button type="button" class="btn btn-primary btn-sm" @click="router.push('/sales/fiscal/settings')">
      {{ t('sales.fiscalBanner.action') }}
    </button>
  </div>
</template>

<style scoped>
.fiscal-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 10px;
  font-size: 0.9rem;
}
.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
