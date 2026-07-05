<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import ItemForm from './ItemForm.vue';
import { useItemsStore } from '@/stores/items';
import type { Item } from '@/types';
import { useAuthStore } from '@/stores/auth';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const auth = useAuthStore();
const items = useItemsStore();

const showForm = ref(false);
const editingItem = ref<Item | null>(null);
const actionError = ref<string | null>(null);

onMounted(async () => {
  await items.loadItems();
});

function openCreate(): void {
  editingItem.value = null;
  showForm.value = true;
  actionError.value = null;
}

function openEdit(item: Item): void {
  editingItem.value = item;
  showForm.value = true;
  actionError.value = null;
}

function closeForm(): void {
  showForm.value = false;
  editingItem.value = null;
}

async function onSave(payload: {
  name: string;
  description: string;
  stockQuantity: number;
  trackStock: boolean;
  unitPrice: number | null;
}): Promise<void> {
  actionError.value = null;
  try {
    const apiPayload = {
      name: payload.name,
      description: payload.description || null,
      stockQuantity: payload.stockQuantity,
      trackStock: payload.trackStock,
      unitPrice: payload.unitPrice,
    };
    if (editingItem.value) {
      await items.editItem(editingItem.value.id, apiPayload);
    } else {
      await items.addItem(apiPayload);
    }
    closeForm();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}

async function onDelete(item: Item): Promise<void> {
  if (!confirm(t('items.confirmDelete'))) return;
  actionError.value = null;
  try {
    await items.removeItem(item.id);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  }
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="header">
        <h1>{{ t('items.title') }}</h1>
        <button
          v-if="auth.isAdmin"
          type="button"
          class="btn btn-primary"
          @click="openCreate"
        >
          {{ t('items.create') }}
        </button>
      </div>

      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <p v-if="items.errorKey && !items.items.length" class="error">{{ t(items.errorKey) }}</p>

      <ItemForm
        v-if="showForm && auth.isAdmin"
        :item="editingItem"
        @save="onSave"
        @cancel="closeForm"
      />

      <div v-if="items.loading" class="empty">{{ t('app.loading') }}</div>

      <div v-else-if="!items.items.length" class="empty">
        {{ t('items.empty') }}
      </div>

      <table v-else class="items-table">
        <thead>
          <tr>
            <th>{{ t('items.name') }}</th>
            <th>{{ t('items.description') }}</th>
            <th>{{ t('items.stockQuantity') }}</th>
            <th>{{ t('items.unitPrice') }}</th>
            <th v-if="auth.isAdmin">{{ t('items.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.description || '—' }}</td>
            <td>
              <template v-if="item.track_stock">{{ item.stock_quantity }}</template>
              <span v-else class="muted">—</span>
            </td>
            <td>{{ item.unit_price != null ? Number(item.unit_price).toFixed(2) : '—' }}</td>
            <td v-if="auth.isAdmin" class="row-actions">
              <button type="button" class="btn btn-ghost" @click="openEdit(item)">
                {{ t('items.edit') }}
              </button>
              <button type="button" class="btn btn-danger" @click="onDelete(item)">
                {{ t('items.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

th,
td {
  padding: 0.875rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: var(--bg);
}

.row-actions {
  display: flex;
  gap: 0.5rem;
}

.muted {
  color: var(--text-muted);
}
</style>
