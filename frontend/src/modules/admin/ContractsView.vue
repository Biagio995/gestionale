<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAdminStore } from '@/stores/admin';
import type { CompanyContract, CompanyContractPayload, ContractRenewalRecord, ContractStatus } from '@/types';
import { extractApiError } from '@/services/api';

const { t } = useI18n();
const route = useRoute();
const admin = useAdminStore();

const showCreateForm = ref(false);
const editingContract = ref<CompanyContract | null>(null);
const errorKey = ref<string | null>(null);
const statusFilter = ref<ContractStatus | ''>('');
const expiringSoon = ref(false);

const createForm = reactive<CompanyContractPayload>({
  tenantId: '',
  title: '',
  contractNumber: '',
  status: 'ACTIVE',
  startsAt: '',
  endsAt: '',
  signedAt: '',
  amount: null,
  currency: 'EUR',
  autoRenew: false,
  renewalType: 'NONE',
  notes: '',
  documentUrl: '',
});

const editForm = reactive({
  title: '',
  contractNumber: '',
  status: 'ACTIVE' as ContractStatus,
  startsAt: '',
  endsAt: '',
  signedAt: '',
  amount: null as number | null,
  currency: 'EUR',
  autoRenew: false,
  renewalType: 'NONE' as 'NONE' | 'MONTHLY' | 'YEARLY',
  notes: '',
  documentUrl: '',
});

const renewForm = reactive({
  newEndsAt: '',
  newAmount: null as number | null,
  notes: '',
});

const renewing = ref(false);

const renewalHistory = computed<ContractRenewalRecord[]>(
  () => admin.currentContract?.renewals ?? [],
);

const canRenew = computed(() => {
  const contract = editingContract.value;
  return contract != null && contract.status !== 'TERMINATED';
});

const filteredContracts = computed(() => admin.contracts);

onMounted(async () => {
  if (route.query.expiring === '1') {
    expiringSoon.value = true;
  }
  await Promise.all([admin.loadCompanies(), loadContracts()]);
});

async function loadContracts(): Promise<void> {
  errorKey.value = null;
  try {
    await admin.loadContracts({
      status: statusFilter.value || undefined,
      expiringInDays: expiringSoon.value ? 30 : undefined,
    });
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function openCreate(): void {
  editingContract.value = null;
  showCreateForm.value = true;
  if (!createForm.tenantId && admin.companies.length > 0) {
    createForm.tenantId = admin.companies[0]!.id;
  }
}

async function openEdit(contract: CompanyContract): Promise<void> {
  showCreateForm.value = false;
  editingContract.value = contract;
  editForm.title = contract.title;
  editForm.contractNumber = contract.contract_number ?? '';
  editForm.status = contract.status;
  editForm.startsAt = contract.starts_at.slice(0, 10);
  editForm.endsAt = contract.ends_at?.slice(0, 10) ?? '';
  editForm.signedAt = contract.signed_at?.slice(0, 10) ?? '';
  editForm.amount = contract.amount ? Number(contract.amount) : null;
  editForm.currency = contract.currency;
  editForm.autoRenew = contract.auto_renew;
  editForm.renewalType = contract.renewal_type;
  editForm.notes = contract.notes ?? '';
  editForm.documentUrl = contract.document_url ?? '';
  renewForm.newEndsAt = '';
  renewForm.newAmount = editForm.amount;
  renewForm.notes = '';
  errorKey.value = null;
  try {
    await admin.loadContract(contract.id);
    const updated = admin.currentContract?.contract;
    if (updated) {
      editingContract.value = updated;
      editForm.endsAt = updated.ends_at?.slice(0, 10) ?? '';
      editForm.amount = updated.amount ? Number(updated.amount) : null;
      editForm.documentUrl = updated.document_url ?? '';
      renewForm.newAmount = editForm.amount;
    }
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function closeForms(): void {
  showCreateForm.value = false;
  editingContract.value = null;
  admin.currentContract = null;
}

async function onCreate(): Promise<void> {
  errorKey.value = null;
  try {
    await admin.addContract({
      ...createForm,
      contractNumber: createForm.contractNumber || null,
      endsAt: createForm.endsAt || null,
      signedAt: createForm.signedAt || null,
      notes: createForm.notes || null,
      documentUrl: createForm.documentUrl || null,
    });
    createForm.title = '';
    createForm.contractNumber = '';
    createForm.startsAt = '';
    createForm.endsAt = '';
    createForm.signedAt = '';
    createForm.amount = null;
    createForm.notes = '';
    createForm.documentUrl = '';
    closeForms();
    await loadContracts();
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

async function onEdit(): Promise<void> {
  if (!editingContract.value) return;
  errorKey.value = null;
  try {
    await admin.editContract(editingContract.value.id, {
      title: editForm.title,
      contractNumber: editForm.contractNumber || null,
      status: editForm.status,
      startsAt: editForm.startsAt,
      endsAt: editForm.endsAt || null,
      signedAt: editForm.signedAt || null,
      amount: editForm.amount,
      currency: editForm.currency,
      autoRenew: editForm.autoRenew,
      renewalType: editForm.renewalType,
      notes: editForm.notes || null,
      documentUrl: editForm.documentUrl || null,
    });
    closeForms();
    await loadContracts();
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

async function onRenew(): Promise<void> {
  if (!editingContract.value) return;
  if (!confirm(t('admin.contracts.renewConfirm'))) return;
  errorKey.value = null;
  renewing.value = true;
  try {
    await admin.renewContract(editingContract.value.id, {
      newEndsAt: renewForm.newEndsAt || undefined,
      newAmount: renewForm.newAmount,
      notes: renewForm.notes || null,
    });
    const updated = admin.currentContract?.contract;
    if (updated) {
      editingContract.value = updated;
      editForm.startsAt = updated.starts_at.slice(0, 10);
      editForm.endsAt = updated.ends_at?.slice(0, 10) ?? '';
      editForm.status = updated.status;
      editForm.amount = updated.amount ? Number(updated.amount) : null;
      renewForm.newAmount = editForm.amount;
      renewForm.newEndsAt = '';
      renewForm.notes = '';
    }
    await loadContracts();
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  } finally {
    renewing.value = false;
  }
}

async function onDelete(contract: CompanyContract): Promise<void> {
  if (!confirm(t('admin.contracts.confirmDelete'))) return;
  errorKey.value = null;
  try {
    await admin.removeContract(contract.id);
  } catch (err) {
    errorKey.value = extractApiError(err).messageKey;
  }
}

function formatAmount(contract: CompanyContract): string {
  if (!contract.amount) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: contract.currency || 'EUR',
  }).format(Number(contract.amount));
}

function formatPeriod(start: string, end: string | null): string {
  const startDate = start.slice(0, 10);
  if (!end) return startDate;
  return `${startDate} → ${end.slice(0, 10)}`;
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('admin.contracts.title') }}</h1>
        <button type="button" class="btn btn-primary" @click="openCreate">
          {{ t('admin.contracts.newContract') }}
        </button>
      </div>

      <div class="filters">
        <select v-model="statusFilter" @change="loadContracts">
          <option value="">{{ t('admin.contracts.allStatuses') }}</option>
          <option value="DRAFT">{{ t('admin.contracts.statuses.DRAFT') }}</option>
          <option value="ACTIVE">{{ t('admin.contracts.statuses.ACTIVE') }}</option>
          <option value="EXPIRED">{{ t('admin.contracts.statuses.EXPIRED') }}</option>
          <option value="TERMINATED">{{ t('admin.contracts.statuses.TERMINATED') }}</option>
        </select>
        <label class="checkbox">
          <input v-model="expiringSoon" type="checkbox" @change="loadContracts" />
          {{ t('admin.contracts.expiringSoon') }}
        </label>
      </div>

      <p v-if="errorKey" class="error-text">{{ t(errorKey) }}</p>

      <form v-if="showCreateForm" class="form-card" @submit.prevent="onCreate">
        <h2>{{ t('admin.contracts.createTitle') }}</h2>
        <div class="form-grid">
          <label>
            <span>{{ t('admin.company') }}</span>
            <select v-model="createForm.tenantId" required>
              <option v-for="company in admin.companies" :key="company.id" :value="company.id">
                {{ company.name }}
              </option>
            </select>
          </label>
          <label>
            <span>{{ t('admin.contracts.contractNumber') }}</span>
            <input v-model="createForm.contractNumber" />
          </label>
          <label>
            <span>{{ t('admin.contracts.contractTitle') }}</span>
            <input v-model="createForm.title" required />
          </label>
          <label>
            <span>{{ t('admin.contracts.status') }}</span>
            <select v-model="createForm.status">
              <option value="DRAFT">{{ t('admin.contracts.statuses.DRAFT') }}</option>
              <option value="ACTIVE">{{ t('admin.contracts.statuses.ACTIVE') }}</option>
              <option value="EXPIRED">{{ t('admin.contracts.statuses.EXPIRED') }}</option>
              <option value="TERMINATED">{{ t('admin.contracts.statuses.TERMINATED') }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('admin.contracts.startsAt') }}</span>
            <input v-model="createForm.startsAt" type="date" required />
          </label>
          <label>
            <span>{{ t('admin.contracts.endsAt') }}</span>
            <input v-model="createForm.endsAt" type="date" />
          </label>
          <label>
            <span>{{ t('admin.contracts.signedAt') }}</span>
            <input v-model="createForm.signedAt" type="date" />
          </label>
          <label>
            <span>{{ t('admin.contracts.amount') }}</span>
            <input v-model.number="createForm.amount" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>{{ t('admin.contracts.currency') }}</span>
            <input v-model="createForm.currency" maxlength="3" />
          </label>
          <label>
            <span>{{ t('admin.contracts.renewalType') }}</span>
            <select v-model="createForm.renewalType">
              <option value="NONE">{{ t('admin.contracts.renewals.NONE') }}</option>
              <option value="MONTHLY">{{ t('admin.contracts.renewals.MONTHLY') }}</option>
              <option value="YEARLY">{{ t('admin.contracts.renewals.YEARLY') }}</option>
            </select>
          </label>
          <label class="checkbox">
            <input v-model="createForm.autoRenew" type="checkbox" />
            <span>{{ t('admin.contracts.autoRenew') }}</span>
          </label>
          <label class="full">
            <span>{{ t('admin.contracts.notes') }}</span>
            <textarea v-model="createForm.notes" rows="3" />
          </label>
          <label class="full">
            <span>{{ t('admin.contracts.documentUrl') }}</span>
            <input v-model="createForm.documentUrl" type="url" placeholder="https://" />
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForms">{{ t('items.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('admin.contracts.create') }}</button>
        </div>
      </form>

      <form v-if="editingContract" class="form-card" @submit.prevent="onEdit">
        <h2>{{ t('admin.contracts.editTitle') }}</h2>
        <div class="form-grid">
          <label>
            <span>{{ t('admin.contracts.contractNumber') }}</span>
            <input v-model="editForm.contractNumber" />
          </label>
          <label>
            <span>{{ t('admin.contracts.contractTitle') }}</span>
            <input v-model="editForm.title" required />
          </label>
          <label>
            <span>{{ t('admin.contracts.status') }}</span>
            <select v-model="editForm.status">
              <option value="DRAFT">{{ t('admin.contracts.statuses.DRAFT') }}</option>
              <option value="ACTIVE">{{ t('admin.contracts.statuses.ACTIVE') }}</option>
              <option value="EXPIRED">{{ t('admin.contracts.statuses.EXPIRED') }}</option>
              <option value="TERMINATED">{{ t('admin.contracts.statuses.TERMINATED') }}</option>
            </select>
          </label>
          <label>
            <span>{{ t('admin.contracts.startsAt') }}</span>
            <input v-model="editForm.startsAt" type="date" required />
          </label>
          <label>
            <span>{{ t('admin.contracts.endsAt') }}</span>
            <input v-model="editForm.endsAt" type="date" />
          </label>
          <label>
            <span>{{ t('admin.contracts.signedAt') }}</span>
            <input v-model="editForm.signedAt" type="date" />
          </label>
          <label>
            <span>{{ t('admin.contracts.amount') }}</span>
            <input v-model.number="editForm.amount" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>{{ t('admin.contracts.currency') }}</span>
            <input v-model="editForm.currency" maxlength="3" />
          </label>
          <label>
            <span>{{ t('admin.contracts.renewalType') }}</span>
            <select v-model="editForm.renewalType">
              <option value="NONE">{{ t('admin.contracts.renewals.NONE') }}</option>
              <option value="MONTHLY">{{ t('admin.contracts.renewals.MONTHLY') }}</option>
              <option value="YEARLY">{{ t('admin.contracts.renewals.YEARLY') }}</option>
            </select>
          </label>
          <label class="checkbox">
            <input v-model="editForm.autoRenew" type="checkbox" />
            <span>{{ t('admin.contracts.autoRenew') }}</span>
          </label>
          <label class="full">
            <span>{{ t('admin.contracts.notes') }}</span>
            <textarea v-model="editForm.notes" rows="3" />
          </label>
          <label class="full">
            <span>{{ t('admin.contracts.documentUrl') }}</span>
            <input v-model="editForm.documentUrl" type="url" placeholder="https://" />
          </label>
        </div>
        <div v-if="canRenew" class="renew-section">
          <h3>{{ t('admin.contracts.renewTitle') }}</h3>
          <div class="form-grid">
            <label>
              <span>{{ t('admin.contracts.newEndsAt') }}</span>
              <input v-model="renewForm.newEndsAt" type="date" />
            </label>
            <label>
              <span>{{ t('admin.contracts.newAmount') }}</span>
              <input v-model.number="renewForm.newAmount" type="number" min="0" step="0.01" />
            </label>
            <label class="full">
              <span>{{ t('admin.contracts.renewNotes') }}</span>
              <textarea v-model="renewForm.notes" rows="2" />
            </label>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="renewing"
            @click="onRenew"
          >
            {{ t('admin.contracts.renew') }}
          </button>
        </div>
        <div v-if="renewalHistory.length" class="renewal-history">
          <h3>{{ t('admin.contracts.renewalHistory') }}</h3>
          <div class="table-scroll">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>{{ t('admin.contracts.renewedAt') }}</th>
                <th>{{ t('admin.contracts.renewedBy') }}</th>
                <th>{{ t('admin.contracts.previousPeriod') }}</th>
                <th>{{ t('admin.contracts.newPeriod') }}</th>
                <th>{{ t('admin.contracts.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="renewal in renewalHistory" :key="renewal.id">
                <td>{{ renewal.renewed_at.slice(0, 10) }}</td>
                <td>{{ renewal.renewed_by_email || '—' }}</td>
                <td>{{ formatPeriod(renewal.previous_starts_at, renewal.previous_ends_at) }}</td>
                <td>{{ formatPeriod(renewal.new_starts_at, renewal.new_ends_at) }}</td>
                <td>
                  {{
                    renewal.new_amount
                      ? new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: editingContract?.currency || 'EUR',
                        }).format(Number(renewal.new_amount))
                      : '—'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        <p v-else-if="admin.currentContract" class="muted-text">
          {{ t('admin.contracts.noRenewals') }}
        </p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="closeForms">{{ t('items.cancel') }}</button>
          <button type="submit" class="btn btn-primary">{{ t('admin.contracts.save') }}</button>
        </div>
      </form>

      <div v-if="admin.loading" class="empty-state">{{ t('app.loading') }}</div>
      <div v-else class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('admin.company') }}</th>
            <th>{{ t('admin.contracts.contractTitle') }}</th>
            <th>{{ t('admin.contracts.contractNumber') }}</th>
            <th>{{ t('admin.contracts.period') }}</th>
            <th>{{ t('admin.contracts.amount') }}</th>
            <th>{{ t('admin.contracts.documentUrl') }}</th>
            <th>{{ t('admin.contracts.status') }}</th>
            <th>{{ t('items.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contract in filteredContracts" :key="contract.id">
            <td>{{ contract.tenant_name || '—' }}</td>
            <td><strong>{{ contract.title }}</strong></td>
            <td>{{ contract.contract_number || '—' }}</td>
            <td>
              {{ contract.starts_at.slice(0, 10) }}
              <span v-if="contract.ends_at"> → {{ contract.ends_at.slice(0, 10) }}</span>
            </td>
            <td>{{ formatAmount(contract) }}</td>
            <td>
              <a
                v-if="contract.document_url"
                :href="contract.document_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t('admin.contracts.viewDocument') }}
              </a>
              <span v-else>—</span>
            </td>
            <td>
              <span :class="`badge badge-${contract.status.toLowerCase()}`">
                {{ t(`admin.contracts.statuses.${contract.status}`) }}
              </span>
            </td>
            <td class="row-actions">
              <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(contract)">
                {{ t('items.edit') }}
              </button>
              <button type="button" class="btn btn-danger btn-sm" @click="onDelete(contract)">
                {{ t('items.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
}

.filters select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-grid label.full {
  grid-column: 1 / -1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
}

.renew-section,
.renewal-history {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.renew-section h3,
.renewal-history h3 {
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.data-table.compact {
  font-size: 0.85rem;
}

.muted-text {
  margin-top: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
