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
  <div v-if="invoice" class="flex flex-col gap-8">
    <div class="glass-panel flex items-center justify-between rounded-3xl p-6">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">Invoice detail</p>
        <h2 class="mt-2 text-2xl font-semibold text-slate-900">{{ invoice.invoiceNumber }}</h2>
        <p class="text-sm text-slate-500">
          Issued {{ formatDate(invoice.issueDate) }} • Due {{ formatDate(invoice.dueDate) }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <InvoiceStatusPill :status="invoice.status" />
        <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" @click="goBack">Back</UButton>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
      <div class="space-y-6">
        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Client details</h3>
          <div class="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p class="text-xs text-slate-500">Client name</p>
              <p class="text-sm font-semibold text-slate-900">{{ client?.fullName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Business</p>
              <p class="text-sm font-semibold text-slate-900">{{ client?.businessName || 'Individual client' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">WhatsApp</p>
              <p class="text-sm text-slate-900">{{ client?.whatsappNumber || client?.phone }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Email</p>
              <p class="text-sm text-slate-900">{{ client?.email || 'Not provided' }}</p>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide red-500">Quick actions</h3>
          <div class="mt-4 flex flex-wrap gap-2">
            <UButton
              v-for="action in statusActions"
              :key="action.label"
              color="gray"
              variant="ghost"
              @click="action.action()"
            >
              {{ action.label }}
            </UButton>
            <UButton color="gray" variant="ghost" :href="`https://wa.me/${client?.whatsappNumber}?text=${encodeURIComponent(shareMessage)}`">
              Share via WhatsApp
            </UButton>
            <UButton color="gray" variant="ghost" :href="`sms:${client?.phone}?body=${encodeURIComponent(shareMessage)}`">
              Send SMS
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              :href="`mailto:${client?.email}?subject=Invoice ${invoice.invoiceNumber}&body=${encodeURIComponent(shareMessage)}`"
            >
              Email invoice
            </UButton>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment simulation</h3>
          <ol class="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600">
            <li>Client dials *170# on their MTN phone.</li>
            <li>Chooses option 6 (Wallet) then 3 (Payments).</li>
            <li>Enters merchant ID <strong>123456</strong> and invoice number.</li>
            <li>Confirms amount {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '' }}.</li>
            <li>Payment status updates here once confirmed.</li>
          </ol>
          <p class="mt-3 text-sm text-slate-500">
            Supabase + Africa's Talking integration will automate this flow, with instant status updates.
          </p>
        </div>
      </div>

      <div class="space-y-6">
        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Line items</h3>
          <div class="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table class="min-w-full divide-y divide-slate-100 text-sm">
              <thead class="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3 text-left">Description</th>
                  <th class="px-4 py-3 text-left">Qty</th>
                  <th class="px-4 py-3 text-left">Unit price</th>
                  <th class="px-4 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white/90">
                <tr v-for="item in invoice.lineItems" :key="item.id">
                  <td class="px-4 py-3 text-slate-900">{{ item.description }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ item.quantity }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ formatCurrency(item.unitPrice, profile.currency) }}</td>
                  <td class="px-4 py-3 text-slate-900">{{ formatCurrency(item.quantity * item.unitPrice, profile.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Totals</h3>
          <div class="mt-4 grid gap-4 text-sm text-slate-600">
            <div class="flex items-center justify-between">
              <span>Subtotal</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.subtotal, profile.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Taxes</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.taxTotal, profile.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Discounts</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.discountTotal, profile.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3">
              <span class="font-semibold text-amber-600">Total due</span>
              <span class="text-lg font-semibold text-amber-700">
                {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="glass-panel flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
    <p class="text-lg font-semibold text-slate-900">Invoice not found</p>
    <p class="text-sm text-slate-500">The invoice you are looking for might have been removed.</p>
    <UButton color="gray" variant="soft" @click="goBack">Back to invoices</UButton>
  </div>
</template>
