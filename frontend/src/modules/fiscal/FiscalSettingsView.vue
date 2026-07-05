<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLayout from '@/components/AppLayout.vue';
import * as fiscalService from '@/services/fiscalService';
import { extractApiError } from '@/services/api';
import { validateItalianVat } from '@/utils/italianFiscal';
import type { FiscalProfile } from '@/types';

const { t } = useI18n();

const loading = ref(true);
const saving = ref(false);
const validating = ref(false);
const actionError = ref<string | null>(null);
const vatFeedback = ref<string | null>(null);
const vatValid = ref<boolean | null>(null);

const form = reactive({
  legalName: '',
  vatNumber: '',
  taxCode: '',
  fiscalRegime: 'RF01',
  address: '',
  city: '',
  zipCode: '',
  province: '',
  country: 'IT',
  sdiCode: '',
  pecEmail: '',
  defaultPaymentDays: 30,
});

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  try {
    const profile = await fiscalService.fetchFiscalProfile();
    if (profile) applyProfile(profile);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function applyProfile(profile: FiscalProfile): void {
  form.legalName = profile.legal_name;
  form.vatNumber = profile.vat_number;
  form.taxCode = profile.tax_code ?? '';
  form.fiscalRegime = profile.fiscal_regime;
  form.address = profile.address ?? '';
  form.city = profile.city ?? '';
  form.zipCode = profile.zip_code ?? '';
  form.province = profile.province ?? '';
  form.country = profile.country;
  form.sdiCode = profile.sdi_code ?? '';
  form.pecEmail = profile.pec_email ?? '';
  form.defaultPaymentDays = profile.default_payment_days ?? 30;
}

async function onValidateVat(): Promise<void> {
  if (!form.vatNumber.trim()) return;
  validating.value = true;
  vatFeedback.value = null;
  vatValid.value = null;
  const local = validateItalianVat(form.vatNumber);
  if (!local.checksumValid) {
    vatValid.value = false;
    vatFeedback.value = t('fiscal.vat.invalid');
    validating.value = false;
    return;
  }
  try {
    const result = await fiscalService.validateVat(form.vatNumber);
    vatValid.value = result.valid;
    if (result.normalized) form.vatNumber = result.normalized;
    if (result.valid) {
      const parts = [t('fiscal.vat.valid')];
      if (result.viesName) parts.push(result.viesName);
      vatFeedback.value = parts.join(' — ');
    } else {
      vatFeedback.value = t('fiscal.vat.invalid');
    }
  } catch {
    vatValid.value = local.valid;
    vatFeedback.value = local.valid ? t('fiscal.vat.validLocal') : t('fiscal.vat.invalid');
  } finally {
    validating.value = false;
  }
}

async function onSubmit(): Promise<void> {
  saving.value = true;
  actionError.value = null;
  try {
    const profile = await fiscalService.saveFiscalProfile({
      legalName: form.legalName.trim(),
      vatNumber: form.vatNumber.trim(),
      taxCode: form.taxCode.trim() || null,
      fiscalRegime: form.fiscalRegime,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      zipCode: form.zipCode.trim() || null,
      province: form.province.trim().toUpperCase() || null,
      country: form.country.trim().toUpperCase(),
      sdiCode: form.sdiCode.trim().toUpperCase() || null,
      pecEmail: form.pecEmail.trim() || null,
      defaultPaymentDays: form.defaultPaymentDays,
    });
    applyProfile(profile);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <h1>{{ t('fiscal.settings.title') }}</h1>
      </div>

      <p class="hint">{{ t('fiscal.settings.hint') }}</p>
      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <form v-else class="card form-card" @submit.prevent="onSubmit">
        <div class="form-grid">
          <label class="full">
            <span>{{ t('fiscal.settings.legalName') }}</span>
            <input v-model="form.legalName" required />
          </label>

          <label>
            <span>{{ t('fiscal.settings.vatNumber') }}</span>
            <div class="input-with-action">
              <input v-model="form.vatNumber" required />
              <button
                type="button"
                class="btn btn-ghost"
                :disabled="validating || !form.vatNumber.trim()"
                @click="onValidateVat"
              >
                {{ t('fiscal.vat.validate') }}
              </button>
            </div>
            <span v-if="vatFeedback" :class="vatValid ? 'vat-ok' : 'vat-ko'">{{ vatFeedback }}</span>
          </label>

          <label>
            <span>{{ t('fiscal.settings.taxCode') }}</span>
            <input v-model="form.taxCode" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.fiscalRegime') }}</span>
            <input v-model="form.fiscalRegime" maxlength="10" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.sdiCode') }}</span>
            <input v-model="form.sdiCode" maxlength="7" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.pecEmail') }}</span>
            <input v-model="form.pecEmail" type="email" />
          </label>
          <label>
            <span>{{ t('fiscal.settings.defaultPaymentDays') }}</span>
            <input v-model.number="form.defaultPaymentDays" type="number" min="0" max="365" />
          </label>

          <label class="full">
            <span>{{ t('fiscal.settings.address') }}</span>
            <input v-model="form.address" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.city') }}</span>
            <input v-model="form.city" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.zipCode') }}</span>
            <input v-model="form.zipCode" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.province') }}</span>
            <input v-model="form.province" maxlength="2" />
          </label>

          <label>
            <span>{{ t('fiscal.settings.country') }}</span>
            <input v-model="form.country" maxlength="2" />
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ t('fiscal.settings.save') }}
          </button>
        </div>
      </form>
    </main>
  </AppLayout>
</template>

<style scoped>
.hint {
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

label.full {
  grid-column: 1 / -1;
}

input {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
}

.input-with-action {
  display: flex;
  gap: 0.5rem;
}

.input-with-action input {
  flex: 1;
}

.vat-ok {
  color: var(--success, #15803d);
  font-size: 0.8rem;
}

.vat-ko {
  color: var(--danger);
  font-size: 0.8rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.error {
  color: var(--danger);
  margin-bottom: 1rem;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
