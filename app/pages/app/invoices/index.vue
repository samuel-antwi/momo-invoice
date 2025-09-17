<script setup lang="ts">
import { computed, ref } from "vue";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import { formatCurrency, formatDate, calculateInvoiceTotals } from "~/utils/invoice-helpers";

const { invoices, summary } = useInvoices();
const { clients } = useClients();
const { profile } = useSession();

type InvoiceFilterKey = "all" | "draft" | "sent" | "paid" | "overdue";

const searchTerm = ref("");
const activeStatus = ref<InvoiceFilterKey>("all");

const stats = computed(() => [
  { label: "All", value: invoices.value.length, key: "all" },
  { label: "Draft", value: summary.value.draftCount, key: "draft" },
  { label: "Sent", value: summary.value.sentCount, key: "sent" },
  { label: "Paid", value: summary.value.paidCount, key: "paid" },
  { label: "Overdue", value: summary.value.overdueCount, key: "overdue" },
]);

const filteredInvoices = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return invoices.value.filter((invoice) => {
    const client = clients.value.find((client) => client.id === invoice.clientId);
    const matchesTerm = term
      ? [
          invoice.invoiceNumber.toLowerCase(),
          client?.fullName?.toLowerCase() ?? "",
          client?.businessName?.toLowerCase() ?? "",
        ].some((field) => field.includes(term))
      : true;

    const matchesStatus = activeStatus.value === "all" ? true : invoice.status === activeStatus.value;

    return matchesTerm && matchesStatus;
  });
});

const clientName = (id: string) => clients.value.find((client) => client.id === id)?.fullName ?? "Unknown";

const invoiceAmount = (invoiceId: string) => {
  const record = invoices.value.find((invoice) => invoice.id === invoiceId);
  if (!record) return 0;
  return calculateInvoiceTotals(record).grandTotal;
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-slate-900">Invoices</h2>
        <p class="text-sm text-slate-500">Track and follow up on every invoice from one dashboard.</p>
      </div>
      <UButton color="primary" icon="i-heroicons-plus" size="lg">New invoice</UButton>
    </section>

    <UCard :ui="{ body: 'space-y-4 p-5' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
      <UInput
        v-model="searchTerm"
        icon="i-heroicons-magnifying-glass-20-solid"
        placeholder="Search by client or invoice number"
        size="lg"
      />

      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="stat in stats"
          :key="stat.key"
          :label="`${stat.label} (${stat.value})`"
          :color="activeStatus.value === stat.key ? 'primary' : 'gray'"
          :variant="activeStatus.value === stat.key ? 'soft' : 'ghost'"
          size="sm"
          @click="activeStatus.value = stat.key as InvoiceFilterKey"
        />
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-0' }" class="overflow-hidden border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100 text-sm">
          <thead class="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Invoice</th>
              <th class="px-4 py-3 text-left font-semibold">Client</th>
              <th class="px-4 py-3 text-left font-semibold">Issued</th>
              <th class="px-4 py-3 text-left font-semibold">Due</th>
              <th class="px-4 py-3 text-left font-semibold">Amount</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white/60">
            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-slate-50/70">
              <td class="px-4 py-3 font-medium text-slate-900">
                <NuxtLink :to="`/app/invoices/${invoice.id}`" class="text-amber-600 hover:text-amber-700">
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ clientName(invoice.clientId) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ formatDate(invoice.issueDate) }}</td>
              <td class="px-4 py-3 text-slate-500">{{ formatDate(invoice.dueDate) }}</td>
              <td class="px-4 py-3 text-slate-900">
                {{ formatCurrency(invoiceAmount(invoice.id), profile.currency) }}
              </td>
              <td class="px-4 py-3">
                <InvoiceStatusPill :status="invoice.status" />
              </td>
              <td class="px-4 py-3 text-right">
                <UButton :to="`/app/invoices/${invoice.id}`" color="gray" variant="ghost" size="sm">View</UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!filteredInvoices.length" class="px-4 py-5 text-center text-sm text-slate-500">
        No invoices match your filters yet.
      </p>
    </UCard>
  </div>
</template>
