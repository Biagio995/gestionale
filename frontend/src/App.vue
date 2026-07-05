<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const { locale } = useI18n();

watch(
  () => auth.user?.language,
  (lang) => {
    if (lang) {
      locale.value = lang;
    }
  },
  { immediate: true },
);
</script>

<template>
  <RouterView />
</template>
