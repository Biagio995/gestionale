<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import * as itemsService from '@/services/itemsService';
import type { Item, SalesLinePayload } from '@/types';

const props = defineProps<{
  modelValue: SalesLinePayload[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: SalesLinePayload[]];
}>();

const { t } = useI18n();
const catalogItems = ref<Item[]>([]);
const lines = reactive<SalesLinePayload[]>([]);

onMounted(async () => {
  try {
    catalogItems.value = await itemsService.fetchItems();
  } catch {
    /* catalog optional */
  }
});

watch(
  () => props.modelValue,
  (value) => {
    lines.splice(0, lines.length, ...value.map((l) => ({ ...l })));
  },
  { immediate: true, deep: true },
);

function sync(): void {
  emit('update:modelValue', lines.map((l) => ({ ...l })));
}

function addLine(): void {
  lines.push({ description: '', quantity: 1, unitPrice: 0, taxRate: 22 });
  sync();
}

function removeLine(index: number): void {
  lines.splice(index, 1);
  sync();
}

function onFieldChange(): void {
  sync();
}

function onItemPick(index: number, itemId: string): void {
  if (!itemId) return;
  const item = catalogItems.value.find((i) => i.id === itemId);
  if (!item) return;
  const line = lines[index]!;
  line.itemId = itemId;
  line.description = item.description ? `${item.name} — ${item.description}` : item.name;
  sync();
}
</script>

<template>
  <div class="lines-editor">
    <div class="lines-header">
      <h3>{{ t('sales.lines.title') }}</h3>
      <button type="button" class="btn btn-secondary btn-sm" @click="addLine">
        {{ t('sales.lines.add') }}
      </button>
    </div>

    <div v-if="!lines.length" class="empty-lines">{{ t('sales.lines.empty') }}</div>

    <div v-for="(line, index) in lines" :key="index" class="line-row">
      <label v-if="catalogItems.length">
        <span>{{ t('sales.lines.catalogItem') }}</span>
        <select @change="onItemPick(index, ($event.target as HTMLSelectElement).value)">
          <option value="">{{ t('sales.lines.pickItem') }}</option>
          <option v-for="item in catalogItems" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
      <label>
        <span>{{ t('sales.lines.description') }}</span>
        <input v-model="line.description" required @input="onFieldChange" />
      </label>
      <label>
        <span>{{ t('sales.lines.quantity') }}</span>
        <input v-model.number="line.quantity" type="number" min="0.001" step="0.001" @input="onFieldChange" />
      </label>
      <label>
        <span>{{ t('sales.lines.unitPrice') }}</span>
        <input v-model.number="line.unitPrice" type="number" min="0" step="0.01" @input="onFieldChange" />
      </label>
      <label>
        <span>{{ t('sales.lines.taxRate') }}</span>
        <input v-model.number="line.taxRate" type="number" min="0" max="100" step="0.01" @input="onFieldChange" />
      </label>
      <button
        v-if="lines.length > 1"
        type="button"
        class="btn btn-danger btn-sm"
        @click="removeLine(index)"
      >
        {{ t('sales.lines.remove') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lines-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lines-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lines-header h3 {
  font-size: 0.95rem;
}

.line-row {
  display: grid;
  grid-template-columns: 1.2fr 2fr 1fr 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
}

input {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}

.empty-lines {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
}

@media (max-width: 900px) {
  .line-row {
    grid-template-columns: 1fr;
  }
}
</style>
