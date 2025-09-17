<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import { calculateInvoiceTotals, formatCurrency, formatDate } from "~/utils/invoice-helpers";

const route = useRoute();
const router = useRouter();
const invoiceId = computed(() => route.params.id as string);

const { invoices, markPaid, setStatus } = useInvoices();
const { clients } = useClients();
const { profile } = useSession();

const invoice = computed(() => invoices.value.find((item) => item.id === invoiceId.value));
const client = computed(() => clients.value.find((item) => item.id === invoice.value?.clientId));
const totals = computed(() => (invoice.value ? calculateInvoiceTotals(invoice.value) : null));

const statusActions = [
  { label: "Mark as paid", action: () => invoice.value && markPaid(invoice.value.id) },
  { label: "Mark as sent", action: () => invoice.value && setStatus(invoice.value.id, "sent") },
  { label: "Mark as overdue", action: () => invoice.value && setStatus(invoice.value.id, "overdue") },
];

const shareMessage = computed(() => {
  if (!invoice.value || !client.value) return "";
  const amount = totals.value ? formatCurrency(totals.value.grandTotal, profile.value.currency) : "";
  return `Hi ${client.value.fullName}, here is your invoice ${invoice.value.invoiceNumber} for ${amount}. Pay via MoMo before ${formatDate(invoice.value.dueDate)}. Thank you!`;
});

const goBack = () => router.push("/app/invoices");
</script>

<template>
  <div v-if="invoice" class="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-16">
    <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" class="self-start" @click="goBack">
      Back to invoices
    </UButton>

    <UCard :ui="{ body: 'flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between' }">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">{{ invoice.invoiceNumber }}</h2>
        <p class="text-sm text-slate-500">
          Issued {{ formatDate(invoice.issueDate) }} • Due {{ formatDate(invoice.dueDate) }}
        </p>
      </div>
      <InvoiceStatusPill :status="invoice.status" />
    </UCard>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)]">
      <UCard :ui="{ body: 'space-y-4 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <h3 class="text-base font-semibold text-slate-900">Client details</h3>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900">{{ client?.fullName }}</p>
          <p class="text-sm text-slate-500">{{ client?.businessName || 'Individual client' }}</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</p>
            <p class="text-sm text-slate-900">{{ client?.whatsappNumber || client?.phone }}</p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
            <p class="text-sm text-slate-900">{{ client?.email || 'Not provided' }}</p>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'space-y-5 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <h3 class="text-base font-semibold text-slate-900">Quick actions</h3>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="action in statusActions"
            :key="action.label"
            color="gray"
            variant="soft"
            @click="action.action()"
          >
            {{ action.label }}
          </UButton>
        </div>
        <div class="space-y-3">
          <h4 class="text-sm font-semibold text-slate-900">Share via</h4>
          <div class="flex flex-wrap gap-2">
            <UButton
              color="emerald"
              icon="i-heroicons-chat-bubble-left-right"
              :href="`https://wa.me/${client?.whatsappNumber}?text=${encodeURIComponent(shareMessage)}`"
              target="_blank"
            >
              WhatsApp
            </UButton>
            <UButton color="gray" variant="ghost" :href="`sms:${client?.phone}?body=${encodeURIComponent(shareMessage)}`">
              SMS
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              :href="`mailto:${client?.email}?subject=Invoice ${invoice.invoiceNumber}&body=${encodeURIComponent(shareMessage)}`"
            >
              Email
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <UCard :ui="{ body: 'space-y-5 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
      <h3 class="text-base font-semibold text-slate-900">Line items</h3>
      <div class="overflow-hidden rounded-2xl border border-slate-100">
        <table class="min-w-full divide-y divide-slate-100 text-sm">
          <thead class="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Description</th>
              <th class="px-4 py-3 text-left font-semibold">Qty</th>
              <th class="px-4 py-3 text-left font-semibold">Unit price</th>
              <th class="px-4 py-3 text-left font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white/60">
            <tr v-for="item in invoice.lineItems" :key="item.id" class="hover:bg-slate-50/70">
              <td class="px-4 py-3 text-slate-900">{{ item.description }}</td>
              <td class="px-4 py-3 text-slate-600">{{ item.quantity }}</td>
              <td class="px-4 py-3 text-slate-600">{{ formatCurrency(item.unitPrice, profile.currency) }}</td>
              <td class="px-4 py-3 text-slate-900">{{ formatCurrency(item.quantity * item.unitPrice, profile.currency) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ totals ? formatCurrency(totals.subtotal, profile.currency) : '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Taxes</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ totals ? formatCurrency(totals.taxTotal, profile.currency) : '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Discounts</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ totals ? formatCurrency(totals.discountTotal, profile.currency) : '-' }}
          </p>
        </div>
        <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-amber-600">Total due</p>
          <p class="mt-1 text-xl font-semibold text-amber-700">
            {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '-' }}
          </p>
        </div>
      </div>
    </UCard>

    <UCard :ui="{ body: 'space-y-4 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
      <h3 class="text-base font-semibold text-slate-900">Payment simulation</h3>
      <ol class="list-decimal space-y-2 pl-4 text-sm text-slate-600">
        <li>Client dials *170# on their MTN phone.</li>
        <li>Chooses option 6 (Wallet) then 3 (Payments).</li>
        <li>Enters merchant ID <strong>123456</strong> and invoice number.</li>
        <li>Confirms amount {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '' }}.</li>
        <li>Payment status updates here once confirmed.</li>
      </ol>
      <p class="text-sm text-slate-500">
        This flow is simulated. Supabase + Africa's Talking integration will automate status updates.
      </p>
    </UCard>
  </div>

  <div v-else class="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 text-center">
    <p class="text-lg font-semibold text-slate-900">Invoice not found</p>
    <p class="text-sm text-slate-500">The invoice you are looking for might have been removed.</p>
    <UButton color="gray" variant="soft" @click="goBack">Back to invoices</UButton>
  </div>
</template>
