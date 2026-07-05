<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import DocumentChain from '@/components/DocumentChain.vue';
import FiscalProfileBanner from '@/components/FiscalProfileBanner.vue';
import { useAuthStore } from '@/stores/auth';
import DocumentLinesEditor from './DocumentLinesEditor.vue';
import * as salesService from '@/services/salesService';
import * as fiscalService from '@/services/fiscalService';
import { extractApiError } from '@/services/api';
import type {
  ConvertDocumentOptions,
  DocumentChain as DocumentChainType,
  LineFulfillment,
  QuotePayload,
  SalesDocumentLine,
  SalesLinePayload,
} from '@/types';

type DocKind = 'quote' | 'order' | 'delivery-note' | 'invoice';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const converting = ref(false);
const sendingSdi = ref(false);
const downloadingXml = ref(false);
const downloadingPdf = ref(false);
const sendingEmail = ref(false);
const savingStatus = ref(false);
const savingQuote = ref(false);
const recordingPayment = ref(false);
const showEditQuote = ref(false);
const actionError = ref<string | null>(null);
const paidAmountInput = ref('');
const selectedStatus = ref('');
const emailTo = ref('');
const document = ref<Record<string, unknown> | null>(null);
const lines = ref<SalesDocumentLine[]>([]);
const chain = ref<DocumentChainType | null>(null);
const fulfillment = ref<LineFulfillment[]>([]);
const showConfirm = ref(false);
const confirmMode = ref<'convert' | 'invoice-wizard' | 'skip-ddt'>('convert');
const skipDdt = ref(false);
const convertPaymentDays = ref<number | null>(null);
const partialLineQty = ref<Record<string, number>>({});
const successMessage = ref<string | null>(null);
const issuing = ref(false);
const showEditInvoice = ref(false);
const savingInvoice = ref(false);

const kind = computed<DocKind>(() => {
  const name = String(route.name ?? '');
  if (name.includes('order')) return 'order';
  if (name.includes('delivery')) return 'delivery-note';
  if (name.includes('invoice')) return 'invoice';
  return 'quote';
});

const titleKey = computed(() => {
  const map: Record<DocKind, string> = {
    quote: 'sales.quotes.detail',
    order: 'sales.orders.detail',
    'delivery-note': 'sales.deliveryNotes.detail',
    invoice: 'sales.invoices.detail',
  };
  return map[kind.value];
});

const statusKey = computed(() => {
  const map: Record<DocKind, string> = {
    quote: 'sales.quotes.statuses',
    order: 'sales.orders.statuses',
    'delivery-note': 'sales.deliveryNotes.statuses',
    invoice: 'sales.invoices.statuses',
  };
  return map[kind.value];
});

const canConvert = computed(() => {
  if (!document.value) return false;
  const status = document.value.status as string;
  if (kind.value === 'quote') return ['DRAFT', 'SENT', 'ACCEPTED'].includes(status);
  if (kind.value === 'order') return ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED'].includes(status);
  if (kind.value === 'delivery-note') return ['DRAFT', 'ISSUED', 'SHIPPED', 'DELIVERED'].includes(status);
  return false;
});

const convertLabel = computed(() => {
  const map: Record<DocKind, string> = {
    quote: 'sales.actions.convertToOrder',
    order: 'sales.actions.convertToDdt',
    'delivery-note': 'sales.actions.convertToInvoice',
    invoice: '',
  };
  return map[kind.value];
});

const canSendSdi = computed(() => {
  if (kind.value !== 'invoice' || !document.value || !auth.isAdmin) return false;
  const sdiStatus = document.value.sdi_status as string;
  const status = document.value.status as string;
  return (
    (sdiStatus === 'NOT_SENT' || sdiStatus === 'REJECTED') &&
    ['ISSUED', 'SENT'].includes(status)
  );
});

const canIssueInvoice = computed(
  () => kind.value === 'invoice' && document.value?.status === 'DRAFT' && auth.isAdmin,
);

const canEditInvoice = computed(
  () => kind.value === 'invoice' && document.value?.status === 'DRAFT' && auth.isAdmin,
);

const canWizardInvoice = computed(() => {
  if (!document.value || !auth.isAdmin) return false;
  if (kind.value === 'quote') {
    return ['DRAFT', 'SENT', 'ACCEPTED', 'CONVERTED'].includes(document.value.status as string);
  }
  if (kind.value === 'order') {
    return ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED'].includes(document.value.status as string);
  }
  return false;
});

const canSkipDdt = computed(
  () => kind.value === 'order' && canConvert.value && auth.isAdmin,
);

const showPartialPicker = computed(() => {
  if (!fulfillment.value.some((row) => row.remaining > 0)) return false;
  if (kind.value === 'order' && ['convert', 'skip-ddt'].includes(confirmMode.value)) return true;
  if (kind.value === 'delivery-note' && confirmMode.value === 'convert') return true;
  return false;
});

const showPaymentDays = computed(() => {
  if (confirmMode.value === 'invoice-wizard' || confirmMode.value === 'skip-ddt') return true;
  if (kind.value === 'delivery-note' && confirmMode.value === 'convert') return true;
  return false;
});

const canDownloadXml = computed(() => {
  if (kind.value !== 'invoice' || !document.value) return false;
  const sdiStatus = document.value.sdi_status as string;
  return sdiStatus !== 'NOT_SENT';
});

const canRecordPayment = computed(() => {
  if (kind.value !== 'invoice' || !document.value || !auth.isAdmin) return false;
  return document.value.payment_status !== 'PAID';
});

const pdfApiKind = computed((): salesService.SalesDocKind | null => {
  const map: Record<DocKind, salesService.SalesDocKind> = {
    quote: 'quotes',
    order: 'orders',
    'delivery-note': 'delivery-notes',
    invoice: 'invoices',
  };
  return map[kind.value];
});

const statusOptions = computed((): string[] => {
  const map: Record<DocKind, string[]> = {
    quote: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
    order: ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'FULFILLED', 'CANCELLED'],
    'delivery-note': ['DRAFT', 'ISSUED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    invoice: ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELLED'],
  };
  return map[kind.value];
});

const canEditQuote = computed(
  () => kind.value === 'quote' && document.value?.status === 'DRAFT' && auth.isAdmin,
);

const quoteEditForm = ref<QuotePayload>({
  customerCompanyName: '',
  customerName: '',
  customerVatNumber: '',
  customerTaxCode: '',
  customerSdiCode: '',
  customerPecEmail: '',
  customerEmail: '',
  customerAddress: '',
  notes: '',
  lines: [],
});

const invoiceEditForm = ref<QuotePayload>({
  customerCompanyName: '',
  customerName: '',
  customerVatNumber: '',
  customerTaxCode: '',
  customerSdiCode: '',
  customerPecEmail: '',
  customerEmail: '',
  customerAddress: '',
  notes: '',
  lines: [],
});

const backRoute = computed(() => {
  const map: Record<DocKind, string> = {
    quote: '/sales/quotes',
    order: '/sales/orders',
    'delivery-note': '/sales/delivery-notes',
    invoice: '/sales/invoices',
  };
  return map[kind.value];
});

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  const id = String(route.params.id);
  try {
    if (kind.value === 'quote') {
      const data = await salesService.fetchQuote(id);
      document.value = data.quote as unknown as Record<string, unknown>;
      lines.value = data.lines;
      chain.value = data.chain;
    } else if (kind.value === 'order') {
      const data = await salesService.fetchOrder(id);
      document.value = data.order as unknown as Record<string, unknown>;
      lines.value = data.lines;
      chain.value = data.chain;
      fulfillment.value = data.fulfillment;
    } else if (kind.value === 'delivery-note') {
      const data = await salesService.fetchDeliveryNote(id);
      document.value = data.deliveryNote as unknown as Record<string, unknown>;
      lines.value = data.lines;
      chain.value = data.chain;
      fulfillment.value = data.fulfillment;
    } else {
      const data = await salesService.fetchInvoice(id);
      document.value = data.invoice as unknown as Record<string, unknown>;
      lines.value = data.lines;
      chain.value = data.chain;
      paidAmountInput.value = String(
        Number(data.invoice.paid_amount) > 0
          ? data.invoice.paid_amount
          : data.invoice.total,
      );
    }
    if (document.value) {
      selectedStatus.value = String(document.value.status);
      emailTo.value = String(document.value.customer_email ?? '');
    }
    if (kind.value === 'quote' && document.value) {
      quoteEditForm.value = {
        customerCompanyName: String(document.value.customer_company_name ?? ''),
        customerName: String(document.value.customer_name ?? ''),
        customerVatNumber: String(document.value.customer_vat_number ?? ''),
        customerTaxCode: String(document.value.customer_tax_code ?? ''),
        customerSdiCode: String(document.value.customer_sdi_code ?? ''),
        customerPecEmail: String(document.value.customer_pec_email ?? ''),
        customerEmail: String(document.value.customer_email ?? ''),
        customerAddress: String(document.value.customer_address ?? ''),
        notes: String(document.value.notes ?? ''),
        lines: lines.value.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
          taxRate: Number(l.tax_rate),
          itemId: l.item_id,
        })),
      };
    }
    if (kind.value === 'invoice' && document.value) {
      invoiceEditForm.value = {
        customerCompanyName: String(document.value.customer_company_name ?? ''),
        customerName: String(document.value.customer_name ?? ''),
        customerVatNumber: String(document.value.customer_vat_number ?? ''),
        customerTaxCode: String(document.value.customer_tax_code ?? ''),
        customerSdiCode: String(document.value.customer_sdi_code ?? ''),
        customerPecEmail: String(document.value.customer_pec_email ?? ''),
        customerEmail: String(document.value.customer_email ?? ''),
        customerAddress: String(document.value.customer_address ?? ''),
        notes: String(document.value.notes ?? ''),
        lines: lines.value.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
          taxRate: Number(l.tax_rate),
          itemId: l.item_id,
        })),
      };
    }
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: unknown, currency: unknown): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency ?? 'EUR'),
  }).format(Number(value ?? 0));
}

function openConvertConfirm(mode: 'convert' | 'invoice-wizard' | 'skip-ddt' = 'convert'): void {
  confirmMode.value = mode;
  skipDdt.value = mode === 'invoice-wizard' || mode === 'skip-ddt';
  convertPaymentDays.value = null;
  partialLineQty.value = {};
  for (const row of fulfillment.value) {
    if (row.remaining > 0) {
      partialLineQty.value[row.lineId] = row.remaining;
    }
  }
  showConfirm.value = true;
}

function lineDescription(lineId: string): string {
  return lines.value.find((line) => line.id === lineId)?.description ?? lineId;
}

function buildConvertOptions(): ConvertDocumentOptions {
  const options: ConvertDocumentOptions = { skipDdt: skipDdt.value };
  if (convertPaymentDays.value != null && convertPaymentDays.value >= 0) {
    options.paymentDays = convertPaymentDays.value;
  }
  if (showPartialPicker.value) {
    const selections = Object.entries(partialLineQty.value)
      .filter(([, qty]) => qty > 0)
      .map(([lineId, quantity]) => ({ lineId, quantity }));
    if (selections.length) {
      options.lines = selections;
    }
  }
  return options;
}

async function onConvert(): Promise<void> {
  openConvertConfirm('convert');
}

async function executeConvert(): Promise<void> {
  if (!document.value) return;
  converting.value = true;
  actionError.value = null;
  successMessage.value = null;
  const id = String(document.value.id);
  const options = buildConvertOptions();
  try {
    if (confirmMode.value === 'invoice-wizard' && kind.value === 'quote') {
      const invoice = await salesService.convertQuoteToInvoice(id, options);
      successMessage.value = t('sales.convert.success');
      router.push(`/sales/invoices/${invoice.id}`);
      return;
    }
    if (confirmMode.value === 'skip-ddt' && kind.value === 'order') {
      const invoice = await salesService.convertOrderToInvoice(id, options);
      successMessage.value = t('sales.convert.success');
      router.push(`/sales/invoices/${invoice.id}`);
      return;
    }
    if (kind.value === 'quote') {
      const order = await salesService.convertQuoteToOrder(id);
      router.push(`/sales/orders/${order.id}`);
    } else if (kind.value === 'order') {
      const note = await salesService.convertOrderToDeliveryNote(id, options);
      router.push(`/sales/delivery-notes/${note.id}`);
    } else if (kind.value === 'delivery-note') {
      const invoice = await salesService.convertDeliveryNoteToInvoice(id, options);
      router.push(`/sales/invoices/${invoice.id}`);
    }
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    converting.value = false;
    showConfirm.value = false;
  }
}

async function onSendSdi(): Promise<void> {
  if (!document.value) return;
  sendingSdi.value = true;
  actionError.value = null;
  try {
    const result = await fiscalService.sendInvoiceToSdi(String(document.value.id));
    document.value = result.invoice as unknown as Record<string, unknown>;
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    sendingSdi.value = false;
  }
}

async function onDownloadXml(): Promise<void> {
  if (!document.value) return;
  downloadingXml.value = true;
  actionError.value = null;
  try {
    const xml = await fiscalService.fetchInvoiceXml(String(document.value.id));
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.value.document_number}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    downloadingXml.value = false;
  }
}

async function onRecordPayment(): Promise<void> {
  if (!document.value) return;
  recordingPayment.value = true;
  actionError.value = null;
  try {
    const invoice = await fiscalService.recordInvoicePayment(
      String(document.value.id),
      Number(paidAmountInput.value),
    );
    document.value = invoice as unknown as Record<string, unknown>;
    paidAmountInput.value = String(invoice.paid_amount);
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    recordingPayment.value = false;
  }
}

async function onStatusChange(): Promise<void> {
  if (!document.value || selectedStatus.value === document.value.status) return;
  savingStatus.value = true;
  actionError.value = null;
  const id = String(document.value.id);
  try {
    if (kind.value === 'quote') {
      document.value = (await salesService.updateQuoteStatus(id, selectedStatus.value)) as unknown as Record<string, unknown>;
    } else if (kind.value === 'order') {
      document.value = (await salesService.updateOrderStatus(id, selectedStatus.value)) as unknown as Record<string, unknown>;
    } else if (kind.value === 'delivery-note') {
      document.value = (await salesService.updateDeliveryNoteStatus(id, selectedStatus.value)) as unknown as Record<string, unknown>;
    } else {
      document.value = (await salesService.updateInvoiceStatus(id, selectedStatus.value)) as unknown as Record<string, unknown>;
    }
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
    selectedStatus.value = String(document.value.status);
  } finally {
    savingStatus.value = false;
  }
}

async function onDownloadPdf(): Promise<void> {
  if (!document.value || !pdfApiKind.value) return;
  downloadingPdf.value = true;
  actionError.value = null;
  try {
    await salesService.downloadDocumentPdf(
      pdfApiKind.value,
      String(document.value.id),
      `${document.value.document_number}.pdf`,
    );
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    downloadingPdf.value = false;
  }
}

async function onSendEmail(): Promise<void> {
  if (!document.value || !pdfApiKind.value) return;
  sendingEmail.value = true;
  actionError.value = null;
  successMessage.value = null;
  try {
    const result = await salesService.emailDocument(pdfApiKind.value, String(document.value.id), {
      to: emailTo.value || undefined,
    });
    successMessage.value = t('sales.email.sent', { email: result.sentTo });
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    sendingEmail.value = false;
  }
}

async function onIssueInvoice(): Promise<void> {
  if (!document.value) return;
  issuing.value = true;
  actionError.value = null;
  try {
    const invoice = await salesService.issueInvoice(String(document.value.id));
    document.value = invoice as unknown as Record<string, unknown>;
    selectedStatus.value = invoice.status;
    successMessage.value = t('sales.invoice.issued');
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    issuing.value = false;
  }
}

async function onSaveInvoice(): Promise<void> {
  if (!document.value) return;
  savingInvoice.value = true;
  actionError.value = null;
  try {
    const invoice = await salesService.updateInvoice(String(document.value.id), {
      ...invoiceEditForm.value,
      lines: invoiceEditForm.value.lines.filter((l) => l.description.trim()),
    });
    document.value = invoice as unknown as Record<string, unknown>;
    showEditInvoice.value = false;
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    savingInvoice.value = false;
  }
}

function onInvoiceLinesUpdate(linesPayload: SalesLinePayload[]): void {
  invoiceEditForm.value.lines = linesPayload;
}

async function onSaveQuote(): Promise<void> {
  if (!document.value) return;
  savingQuote.value = true;
  actionError.value = null;
  try {
    const quote = await salesService.updateQuote(String(document.value.id), {
      ...quoteEditForm.value,
      lines: quoteEditForm.value.lines.filter((l) => l.description.trim()),
    });
    document.value = quote as unknown as Record<string, unknown>;
    showEditQuote.value = false;
    await load();
  } catch (err) {
    actionError.value = extractApiError(err).messageKey;
  } finally {
    savingQuote.value = false;
  }
}

function onQuoteLinesUpdate(linesPayload: SalesLinePayload[]): void {
  quoteEditForm.value.lines = linesPayload;
}
</script>

<template>
  <AppLayout>
    <main class="page">
      <div class="page-header">
        <div>
          <button type="button" class="btn btn-ghost back-btn" @click="router.push(backRoute)">
            ← {{ t('sales.back') }}
          </button>
          <h1>{{ t(titleKey) }}</h1>
        </div>
        <div class="header-actions">
          <button
            v-if="canEditQuote && !showEditQuote"
            type="button"
            class="btn btn-ghost"
            @click="showEditQuote = true"
          >
            {{ t('sales.actions.edit') }}
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            :disabled="downloadingPdf"
            @click="onDownloadPdf"
          >
            {{ t('fiscal.invoice.downloadPdf') }}
          </button>
          <button
            v-if="auth.isAdmin"
            type="button"
            class="btn btn-ghost"
            :disabled="sendingEmail"
            @click="onSendEmail"
          >
            {{ t('sales.actions.sendEmail') }}
          </button>
          <button
            v-if="canWizardInvoice"
            type="button"
            class="btn btn-primary"
            :disabled="converting"
            @click="openConvertConfirm('invoice-wizard')"
          >
            {{ t('sales.actions.convertToInvoice') }}
          </button>
          <button
            v-if="canSkipDdt"
            type="button"
            class="btn btn-ghost"
            :disabled="converting"
            @click="openConvertConfirm('skip-ddt')"
          >
            {{ t('sales.actions.skipDdtInvoice') }}
          </button>
          <button
            v-if="canConvert"
            type="button"
            class="btn btn-primary"
            :disabled="converting"
            @click="onConvert"
          >
            {{ t(convertLabel) }}
          </button>
          <button
            v-if="canEditInvoice && !showEditInvoice"
            type="button"
            class="btn btn-ghost"
            @click="showEditInvoice = true"
          >
            {{ t('sales.actions.edit') }}
          </button>
          <button
            v-if="canIssueInvoice"
            type="button"
            class="btn btn-primary"
            :disabled="issuing"
            @click="onIssueInvoice"
          >
            {{ t('sales.invoice.issue') }}
          </button>
          <button
            v-if="canSendSdi"
            type="button"
            class="btn btn-primary"
            :disabled="sendingSdi"
            @click="onSendSdi"
          >
            {{ t('fiscal.invoice.sendSdi') }}
          </button>
          <button
            v-if="canDownloadXml"
            type="button"
            class="btn btn-ghost"
            :disabled="downloadingXml"
            @click="onDownloadXml"
          >
            {{ t('fiscal.invoice.downloadXml') }}
          </button>
        </div>
      </div>

      <FiscalProfileBanner />
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="actionError" class="error">{{ t(actionError) }}</p>
      <div v-if="loading" class="empty">{{ t('app.loading') }}</div>

      <template v-else-if="document">
        <DocumentChain :chain="chain" />

        <div v-if="fulfillment.length" class="card fulfillment-card">
          <h2>{{ t('sales.fulfillment.title') }}</h2>
          <ul class="fulfillment-list">
            <li v-for="row in fulfillment" :key="row.lineId">
              <span>{{ t('sales.fulfillment.remaining', { qty: row.remaining, total: row.ordered }) }}</span>
            </li>
          </ul>
        </div>

        <div class="card doc-header">
          <div class="meta-grid">
            <div>
              <span class="label">{{ t('sales.columns.number') }}</span>
              <strong>{{ document.document_number }}</strong>
            </div>
            <div>
              <span class="label">{{ t('sales.columns.status') }}</span>
              <div v-if="auth.isAdmin" class="status-row">
                <select v-model="selectedStatus" @change="onStatusChange">
                  <option v-for="opt in statusOptions" :key="opt" :value="opt">
                    {{ t(`${statusKey}.${opt}`) }}
                  </option>
                </select>
                <span v-if="savingStatus" class="muted">{{ t('app.loading') }}</span>
              </div>
              <strong v-else>{{ t(`${statusKey}.${document.status}`) }}</strong>
            </div>
            <div>
              <span class="label">{{ t('sales.columns.customer') }}</span>
              <strong>{{ document.customer_company_name || document.customer_name || '—' }}</strong>
            </div>
            <div v-if="document.customer_vat_number">
              <span class="label">{{ t('sales.customer.vat') }}</span>
              <strong>{{ document.customer_vat_number }}</strong>
            </div>
            <div v-if="kind === 'invoice'">
              <span class="label">{{ t('sales.invoices.sdiStatus') }}</span>
              <strong>{{ t(`sales.invoices.sdi.${document.sdi_status}`) }}</strong>
            </div>
            <div v-if="kind === 'invoice' && document.payment_status">
              <span class="label">{{ t('fiscal.invoice.paymentStatus') }}</span>
              <strong>{{ t(`fiscal.paymentStatus.${document.payment_status}`) }}</strong>
            </div>
            <div v-if="kind === 'invoice' && Number(document.paid_amount) > 0">
              <span class="label">{{ t('fiscal.invoice.paidAmount') }}</span>
              <strong>{{ formatMoney(document.paid_amount, document.currency) }}</strong>
            </div>
            <div>
              <span class="label">{{ t('sales.columns.total') }}</span>
              <strong>{{ formatMoney(document.total, document.currency) }}</strong>
            </div>
          </div>
        </div>

        <form v-if="showEditQuote && canEditQuote" class="card edit-card" @submit.prevent="onSaveQuote">
          <h2>{{ t('sales.actions.edit') }}</h2>
          <div class="grid-2">
            <label>
              <span>{{ t('sales.customer.name') }}</span>
              <input v-model="quoteEditForm.customerName" required />
            </label>
            <label>
              <span>{{ t('sales.customer.company') }}</span>
              <input v-model="quoteEditForm.customerCompanyName" />
            </label>
            <label>
              <span>{{ t('sales.customer.vat') }}</span>
              <input v-model="quoteEditForm.customerVatNumber" />
            </label>
            <label>
              <span>{{ t('sales.customer.taxCode') }}</span>
              <input v-model="quoteEditForm.customerTaxCode" />
            </label>
            <label>
              <span>{{ t('fiscal.settings.sdiCode') }}</span>
              <input v-model="quoteEditForm.customerSdiCode" maxlength="7" />
            </label>
            <label>
              <span>{{ t('fiscal.settings.pecEmail') }}</span>
              <input v-model="quoteEditForm.customerPecEmail" type="email" />
            </label>
            <label class="full-width">
              <span>{{ t('sales.customer.address') }}</span>
              <input v-model="quoteEditForm.customerAddress" />
            </label>
          </div>
          <DocumentLinesEditor :model-value="quoteEditForm.lines" @update:model-value="onQuoteLinesUpdate" />
          <label>
            <span>{{ t('crm.contacts.notes') }}</span>
            <textarea v-model="quoteEditForm.notes" rows="2" />
          </label>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="showEditQuote = false">{{ t('sales.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="savingQuote">{{ t('crm.save') }}</button>
          </div>
        </form>

        <form v-if="showEditInvoice && canEditInvoice" class="card edit-card" @submit.prevent="onSaveInvoice">
          <h2>{{ t('sales.actions.edit') }}</h2>
          <div class="grid-2">
            <label>
              <span>{{ t('sales.customer.name') }}</span>
              <input v-model="invoiceEditForm.customerName" required />
            </label>
            <label>
              <span>{{ t('sales.customer.company') }}</span>
              <input v-model="invoiceEditForm.customerCompanyName" />
            </label>
            <label>
              <span>{{ t('sales.customer.vat') }}</span>
              <input v-model="invoiceEditForm.customerVatNumber" />
            </label>
            <label>
              <span>{{ t('sales.customer.taxCode') }}</span>
              <input v-model="invoiceEditForm.customerTaxCode" />
            </label>
            <label>
              <span>{{ t('fiscal.settings.sdiCode') }}</span>
              <input v-model="invoiceEditForm.customerSdiCode" maxlength="7" />
            </label>
            <label>
              <span>{{ t('fiscal.settings.pecEmail') }}</span>
              <input v-model="invoiceEditForm.customerPecEmail" type="email" />
            </label>
            <label class="full-width">
              <span>{{ t('sales.customer.address') }}</span>
              <input v-model="invoiceEditForm.customerAddress" />
            </label>
          </div>
          <DocumentLinesEditor :model-value="invoiceEditForm.lines" @update:model-value="onInvoiceLinesUpdate" />
          <label>
            <span>{{ t('crm.contacts.notes') }}</span>
            <textarea v-model="invoiceEditForm.notes" rows="2" />
          </label>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="showEditInvoice = false">{{ t('sales.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="savingInvoice">{{ t('crm.save') }}</button>
          </div>
        </form>

        <div class="card">
          <h2>{{ t('sales.lines.title') }}</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('sales.lines.description') }}</th>
                <th>{{ t('sales.lines.quantity') }}</th>
                <th>{{ t('sales.lines.unitPrice') }}</th>
                <th>{{ t('sales.lines.taxRate') }}</th>
                <th>{{ t('sales.lines.lineTotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in lines" :key="line.id">
                <td>{{ line.description }}</td>
                <td>{{ line.quantity }}</td>
                <td>{{ formatMoney(line.unit_price, document.currency) }}</td>
                <td>{{ line.tax_rate }}%</td>
                <td>{{ formatMoney(line.line_total, document.currency) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="totals-label">{{ t('sales.totals.subtotal') }}</td>
                <td>{{ formatMoney(document.subtotal, document.currency) }}</td>
              </tr>
              <tr>
                <td colspan="4" class="totals-label">{{ t('sales.totals.tax') }}</td>
                <td>{{ formatMoney(document.tax_total, document.currency) }}</td>
              </tr>
              <tr>
                <td colspan="4" class="totals-label">{{ t('sales.totals.total') }}</td>
                <td><strong>{{ formatMoney(document.total, document.currency) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="canRecordPayment" class="card payment-card">
          <h2>{{ t('fiscal.invoice.recordPayment') }}</h2>
          <div class="payment-row">
            <label>
              <span>{{ t('fiscal.invoice.paidAmount') }}</span>
              <input v-model="paidAmountInput" type="number" min="0" step="0.01" />
            </label>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="recordingPayment"
              @click="onRecordPayment"
            >
              {{ t('fiscal.invoice.recordPayment') }}
            </button>
          </div>
        </div>
      </template>

      <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false">
        <div class="modal card">
          <h2>{{ t('sales.convert.confirmTitle') }}</h2>
          <p>{{ t('sales.convert.confirmMessage') }}</p>
          <label
            v-if="confirmMode === 'invoice-wizard' || confirmMode === 'skip-ddt'"
            class="checkbox-row"
          >
            <input v-model="skipDdt" type="checkbox" />
            <span>{{ t('sales.convert.skipDdtOption') }}</span>
          </label>
          <label v-if="showPaymentDays" class="field-inline">
            <span>{{ t('sales.convert.paymentDays') }}</span>
            <input
              v-model.number="convertPaymentDays"
              type="number"
              min="0"
              max="365"
              :placeholder="t('sales.convert.paymentDaysDefault')"
            />
          </label>
          <div v-if="showPartialPicker" class="partial-lines">
            <h3>{{ t('sales.convert.partialLines') }}</h3>
            <table class="partial-table">
              <thead>
                <tr>
                  <th>{{ t('sales.lines.description') }}</th>
                  <th>{{ t('sales.convert.remaining') }}</th>
                  <th>{{ t('sales.convert.partialQty') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in fulfillment.filter((r) => r.remaining > 0)" :key="row.lineId">
                  <td>{{ lineDescription(row.lineId) }}</td>
                  <td>{{ row.remaining }} / {{ row.ordered }}</td>
                  <td>
                    <input
                      v-model.number="partialLineQty[row.lineId]"
                      type="number"
                      min="0"
                      :max="row.remaining"
                      step="0.001"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" @click="showConfirm = false">{{ t('sales.cancel') }}</button>
            <button type="button" class="btn btn-primary" :disabled="converting" @click="executeConvert">
              {{ t('sales.convert.confirm') }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </AppLayout>
</template>

<style scoped>
.back-btn {
  margin-bottom: 0.5rem;
  padding-left: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-row select {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.muted {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.edit-card {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.edit-card textarea {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.doc-header {
  margin-bottom: 1rem;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.25rem;
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

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

th,
td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

th {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
}

.totals-label {
  text-align: right;
  color: var(--text-muted);
}

.payment-card {
  margin-top: 1rem;
}

.payment-card h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.payment-row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.payment-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.payment-row input {
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  min-width: 140px;
}

.success { color: #15803d; margin-bottom: 1rem; }
.fulfillment-card { padding: 1rem 1.25rem; margin-bottom: 1rem; }
.fulfillment-card h2 { font-size: 0.95rem; margin-bottom: 0.5rem; }
.fulfillment-list { list-style: none; font-size: 0.85rem; color: var(--text-muted); }

.partial-lines { margin: 1rem 0; }
.partial-lines h3 { font-size: 0.9rem; margin-bottom: 0.5rem; }
.partial-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.partial-table th, .partial-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border); text-align: left; }
.field-inline { display: flex; flex-direction: column; gap: 0.35rem; margin: 0.75rem 0; font-size: 0.875rem; }
.field-inline input { padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 6px; max-width: 120px; }
.edit-card .grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.edit-card .full-width { grid-column: 1 / -1; }
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal { max-width: 420px; width: 100%; padding: 1.25rem; }
.checkbox-row { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0; font-size: 0.9rem; }
</style>
