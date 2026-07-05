<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Item } from '@/types';

const props = defineProps<{
  item?: Item | null;
}>();

const emit = defineEmits<{
  save: [payload: {
    name: string;
    description: string;
    stockQuantity: number;
    trackStock: boolean;
    unitPrice: number | null;
  }];
  cancel: [];
}>();

const { t } = useI18n();

const form = reactive({
  name: '',
  description: '',
  stockQuantity: 0,
  trackStock: false,
  unitPrice: null as number | null,
});

watch(
  () => props.item,
  (item) => {
    form.name = item?.name ?? '';
    form.description = item?.description ?? '';
    form.stockQuantity = item ? Number(item.stock_quantity) : 0;
    form.trackStock = item?.track_stock ?? false;
    form.unitPrice = item?.unit_price != null ? Number(item.unit_price) : null;
  },
  { immediate: true },
);

function onSubmit(): void {
  emit('save', {
    name: form.name,
    description: form.description,
    stockQuantity: form.stockQuantity,
    trackStock: form.trackStock,
    unitPrice: form.unitPrice,
  });
}
</script>

<template>
  <form class="item-form" @submit.prevent="onSubmit">
    <h2>{{ item ? t('items.editTitle') : t('items.createTitle') }}</h2>

    <label>
      <span>{{ t('items.name') }}</span>
      <input v-model="form.name" type="text" required maxlength="200" />
    </label>

    <label>
      <span>{{ t('items.description') }}</span>
      <textarea v-model="form.description" rows="3" maxlength="2000" />
    </label>

    <label class="checkbox-row">
      <input v-model="form.trackStock" type="checkbox" />
      <span>{{ t('items.trackStock') }}</span>
    </label>

    <label v-if="form.trackStock">
      <span>{{ t('items.stockQuantity') }}</span>
      <input v-model.number="form.stockQuantity" type="number" min="0" step="0.001" />
    </label>

    <label>
      <span>{{ t('items.unitPrice') }}</span>
      <input v-model.number="form.unitPrice" type="number" min="0" step="0.01" />
    </label>

    <div class="actions">
      <button type="button" class="btn btn-ghost" @click="emit('cancel')">
        {{ t('items.cancel') }}
      </button>
      <button type="submit" class="btn btn-primary">
        {{ t('items.save') }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.item-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.875rem;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

input,
textarea {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}
</style>
