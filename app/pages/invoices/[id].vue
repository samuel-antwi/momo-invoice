<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import type { InvoiceRecord } from "~/types/models";
import { calculateInvoiceTotals, formatCurrency, formatDate } from "~/utils/invoice-helpers";

interface PublicInvoiceResponse {
  invoice: InvoiceRecord;
  business: {
    name: string;
    logoUrl?: string;
    phone?: string;
    whatsappNumber?: string;
    email?: string;
    address?: string;
    currency: string;
  };
  client: {
    fullName: string;
    businessName?: string;
    email?: string;
    phone?: string;
  };
  paystack?: {
    authorizationUrl: string;
  };
}

definePageMeta({ layout: "public" });

const route = useRoute();
const toast = useToast();

const invoiceId = computed(() => route.params.id as string);

const { data, pending, error, refresh } = useAsyncData(
  () => `public-invoice-${invoiceId.value}`,
  () =>
    $fetch<PublicInvoiceResponse>(`/api/public/invoices/${invoiceId.value}`),
  { watch: [invoiceId] },
);

const invoice = computed(() => data.value?.invoice);
const business = computed(() => data.value?.business);
const client = computed(() => data.value?.client);

const totals = computed(() => (invoice.value ? calculateInvoiceTotals(invoice.value) : null));
const issueDate = computed(() => (invoice.value ? formatDate(invoice.value.issueDate) : undefined));
const dueDate = computed(() => (invoice.value?.dueDate ? formatDate(invoice.value.dueDate) : undefined));
const amountDue = computed(() =>
  totals.value && invoice.value
    ? formatCurrency(totals.value.grandTotal, invoice.value.currency ?? business.value?.currency ?? "GHS")
    : undefined,
);

const isPaid = computed(() => invoice.value?.status === "paid");

const isInitializingPayment = ref(false);

const launchPaystackPayment = async () => {
  if (!invoice.value || isPaid.value) {
    return;
  }

  isInitializingPayment.value = true;

  try {
    const response = await $fetch<{ authorizationUrl: string; reference: string }>(
      `/api/public/invoices/${invoiceId.value}/paystack`,
      { method: "POST" },
    );

    const url = response.authorizationUrl || data.value?.paystack?.authorizationUrl;
    if (!url) {
      throw new Error("Paystack did not return an authorization link");
    }

    if (data.value) {
      data.value.paystack = { authorizationUrl: url };
    }

    if (typeof window !== "undefined") {
      window.location.href = url;
    }
  } catch (err) {
    const providerMessage = (err as { data?: { providerMessage?: string } }).data?.providerMessage;
    const fallback = err instanceof Error ? err.message : undefined;
    toast.add({
      title: "Unable to launch Paystack checkout",
      description: providerMessage || fallback || "Please try again shortly.",
      color: "red",
    });
  } finally {
    isInitializingPayment.value = false;
  }
};

const continueExistingPayment = () => {
  const url = data.value?.paystack?.authorizationUrl;
  if (url && typeof window !== "undefined") {
    window.location.href = url;
  }
};

watch(
  () => ({ invoice: invoice.value, pending: pending.value, error: error.value }),
  async (state) => {
    if (state.pending || state.error || !state.invoice) return;
    if (state.invoice.status === "paid") return;

    if (data.value?.paystack?.authorizationUrl) {
      continueExistingPayment();
      return;
    }

    await launchPaystackPayment();
  },
  { immediate: true },
);
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-10">
    <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div v-if="pending" class="rounded-3xl bg-white p-8 shadow-sm">
        <p class="text-sm text-slate-500">Loading invoice…</p>
      </div>

      <div v-else-if="error" class="rounded-3xl bg-white p-8 shadow-sm">
        <h1 class="text-xl font-semibold text-slate-900">Invoice unavailable</h1>
        <p class="mt-3 text-sm text-slate-600">
          We could not find this invoice. Please check the link you were given or contact the business owner for a
          fresh link.
        </p>
        <UButton class="mt-6" color="gray" variant="soft" @click="refresh">
          Try again
        </UButton>
      </div>

      <div v-else-if="invoice && business" class="flex flex-col gap-6">
        <div class="rounded-3xl bg-white p-6 shadow-sm">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">Invoice</p>
              <h1 class="mt-2 text-2xl font-semibold text-slate-900">{{ invoice.invoiceNumber }}</h1>
              <p class="mt-1 text-sm text-slate-600">
                Issued {{ issueDate }}<span v-if="dueDate"> • Due {{ dueDate }}</span>
              </p>
              <p class="mt-4 text-sm text-slate-500">
                {{ business.name }}
                <span v-if="business.address" class="text-slate-400"> • {{ business.address }}</span>
              </p>
            </div>
            <div class="flex flex-col items-start gap-2 sm:items-end">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                :class="[
                  invoice.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : invoice.status === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : invoice.status === 'sent'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600',
                ]"
              >
                {{ invoice.status }}
              </span>
              <div class="text-right text-sm text-slate-500" v-if="business.phone || business.email">
                <p v-if="business.phone">Phone: {{ business.phone }}</p>
                <p v-if="business.email">Email: {{ business.email }}</p>
              </div>
            </div>
          </div>
          <div class="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Billed to</p>
              <p class="mt-1 font-semibold text-slate-900">{{ client?.fullName }}</p>
              <p v-if="client?.businessName" class="text-slate-500">{{ client.businessName }}</p>
              <p v-if="client?.email" class="mt-1 text-slate-500">{{ client.email }}</p>
              <p v-if="client?.phone" class="text-slate-500">{{ client.phone }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-400">Amount due</p>
              <p class="mt-1 text-2xl font-semibold text-slate-900">{{ amountDue || '-' }}</p>
              <p v-if="invoice.paymentInstructions" class="mt-3 text-xs text-slate-500">
                {{ invoice.paymentInstructions }}
              </p>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-3xl bg-white shadow-sm">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left">Description</th>
                <th class="px-4 py-3 text-right">Qty</th>
                <th class="px-4 py-3 text-right">Unit price</th>
                <th class="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in invoice.lineItems" :key="item.id" class="bg-white">
                <td class="px-4 py-3 text-slate-900">{{ item.description }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ item.quantity }}</td>
                <td class="px-4 py-3 text-right text-slate-600">
                  {{ formatCurrency(item.unitPrice, invoice.currency ?? business.currency) }}
                </td>
                <td class="px-4 py-3 text-right text-slate-900">
                  {{ formatCurrency(item.quantity * item.unitPrice, invoice.currency ?? business.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="rounded-3xl bg-white p-6 shadow-sm">
          <div class="space-y-2 text-sm text-slate-600">
            <div class="flex items-center justify-between">
              <span>Subtotal</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.subtotal, invoice.currency ?? business.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Taxes</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.taxTotal, invoice.currency ?? business.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Discounts</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.discountTotal, invoice.currency ?? business.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span class="font-semibold text-slate-500">Total due</span>
              <span class="text-lg font-semibold text-slate-900">
                {{ amountDue || '-' }}
              </span>
            </div>
          </div>
        </div>

        <div class="rounded-3xl bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-slate-900">Pay securely via Paystack</h2>
          <p v-if="!isPaid" class="mt-2 text-sm text-slate-600">
            Use the button below to open a secure Paystack checkout and complete your payment by mobile money or card.
            Once Paystack confirms your transfer, the invoice will automatically update.
          </p>
          <p v-else class="mt-2 text-sm text-emerald-600">
            This invoice has already been marked as paid. You can keep the receipt for your records.
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <UButton
              v-if="!isPaid"
              color="primary"
              icon="i-heroicons-credit-card"
              :loading="isInitializingPayment"
              @click="launchPaystackPayment"
            >
              Pay with Paystack
            </UButton>
            <UButton
              v-if="!isPaid && data?.paystack?.authorizationUrl"
              color="gray"
              variant="soft"
              icon="i-heroicons-arrow-top-right-on-square"
              @click="continueExistingPayment"
            >
              Continue pending payment
            </UButton>
          </div>
          <p class="mt-4 text-xs text-slate-500">
            Having trouble paying? Reach out to {{ business.name }} via
            <span v-if="business.whatsappNumber">WhatsApp {{ business.whatsappNumber }}</span>
            <span v-if="business.phone && !business.whatsappNumber">phone {{ business.phone }}</span>
            <span v-if="business.email">
              <span v-if="business.whatsappNumber || business.phone"> or </span>{{ business.email }}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
