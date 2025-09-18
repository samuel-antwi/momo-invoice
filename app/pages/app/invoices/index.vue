<script setup lang="ts">
import { computed, ref } from "vue";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import { formatCurrency, formatDate } from "~/utils/invoice-helpers";

const { invoices, summary } = useInvoices();
const { clients } = useClients();
const { profile } = useSession();

type InvoiceFilterKey = "all" | "draft" | "sent" | "paid" | "overdue";

const searchTerm = ref("");
const activeStatus = ref<InvoiceFilterKey>("all");

const stats = computed(() => [
  {
    label: "All",
    value: invoices.value.length,
    key: "all" as InvoiceFilterKey,
  },
  {
    label: "Draft",
    value: summary.value.draftCount,
    key: "draft" as InvoiceFilterKey,
  },
  {
    label: "Sent",
    value: summary.value.sentCount,
    key: "sent" as InvoiceFilterKey,
  },
  {
    label: "Paid",
    value: summary.value.paidCount,
    key: "paid" as InvoiceFilterKey,
  },
  {
    label: "Overdue",
    value: summary.value.overdueCount,
    key: "overdue" as InvoiceFilterKey,
  },
]);

const filteredInvoices = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return invoices.value.filter((invoice) => {
    const client = clients.value.find(
      (client) => client.id === invoice.clientId
    );
    const matchesTerm = term
      ? [
          invoice.invoiceNumber.toLowerCase(),
          client?.fullName?.toLowerCase() ?? "",
          client?.businessName?.toLowerCase() ?? "",
        ].some((field) => field.includes(term))
      : true;

    const matchesStatus =
      activeStatus.value === "all"
        ? true
        : invoice.status === activeStatus.value;

    return matchesTerm && matchesStatus;
  });
});

const clientName = (id: string) => {
  const invoice = invoices.value.find((item) => item.clientId === id);
  if (invoice?.clientName) return invoice.clientName;
  return (
    clients.value.find((client) => client.id === id)?.fullName ?? "Unknown"
  );
};

const invoiceAmount = (invoiceId: string) => {
  const record = invoices.value.find((invoice) => invoice.id === invoiceId);
  if (!record) return 0;
  if (typeof record.total === "number") return record.total;
  return record.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
};
</script>

<template>
  <div class="flex flex-col gap-10 animate-fade-in">
    <section class="card-modern rounded-3xl p-8">
      <div
        class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
            >
              <span class="text-white text-sm">📄</span>
            </div>
            <p
              class="text-sm font-bold uppercase tracking-wider text-purple-500"
            >
              Invoices
            </p>
          </div>
          <h2 class="text-3xl font-bold text-slate-900 gradient-text">
            Manage every invoice with clarity
          </h2>
          <p class="text-sm text-slate-600 leading-relaxed">
            Filter by status, share reminders, and keep MoMo cashflow visible.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <UButton
            class="btn-gradient shadow-lg hover:shadow-xl"
            icon="i-heroicons-plus"
            size="lg"
            >Create invoice</UButton
          >
          <UButton
            variant="outline"
            class="border-slate-300 text-slate-600 hover:bg-slate-50"
            icon="i-heroicons-arrow-down-tray"
            size="lg"
            >Export CSV</UButton
          >
        </div>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-[1.2fr,1fr]">
        <div class="relative">
          <UInput
            v-model="searchTerm"
            icon="i-heroicons-magnifying-glass-20-solid"
            placeholder="Search by client, invoice number, or amount"
            size="lg"
            class="rounded-2xl border border-white/50 bg-white/80 shadow-sm focus:shadow-md transition-all"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            v-for="stat in stats"
            :key="stat.key"
            :label="`${stat.label} (${stat.value})`"
            :class="[
              'rounded-full transition-all duration-200',
              activeStatus.value === stat.key
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-white/80 text-slate-600 border border-slate-200 hover:bg-white hover:shadow-sm',
            ]"
            size="sm"
            @click="activeStatus.value = stat.key"
          />
        </div>
      </div>
    </section>

    <!-- Invoices Table -->
    <section
      class="card-modern rounded-3xl p-0 overflow-hidden animate-slide-up"
      style="animation-delay: 0.2s"
    >
      <div class="overflow-hidden rounded-3xl">
        <table class="min-w-full divide-y divide-slate-100 text-sm">
          <thead class="bg-gradient-to-r from-slate-50 to-slate-100/80">
            <tr>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Invoice
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Client
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Issued
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Due
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Amount
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Status
              </th>
              <th
                class="px-6 py-5 text-right text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white/95">
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="group hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-pink-50/30 transition-all duration-200"
            >
              <td class="px-6 py-5 font-bold text-slate-900">
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-purple-600 hover:text-purple-700 transition-colors"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="px-6 py-5 text-slate-700 font-medium">
                {{ clientName(invoice.clientId) }}
              </td>
              <td class="px-6 py-5 text-slate-600">
                {{ formatDate(invoice.issueDate) }}
              </td>
              <td class="px-6 py-5 text-slate-600">
                {{ formatDate(invoice.dueDate) }}
              </td>
              <td class="px-6 py-5 text-slate-900 font-semibold">
                {{
                  formatCurrency(invoiceAmount(invoice.id), profile.currency)
                }}
              </td>
              <td class="px-6 py-5">
                <InvoiceStatusPill :status="invoice.status" />
              </td>
              <td class="px-6 py-5 text-right">
                <div
                  class="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity"
                >
                  <UButton
                    :to="`/app/invoices/${invoice.id}`"
                    size="xs"
                    class="btn-gradient"
                    >Open</UButton
                  >
                  <UButton
                    :to="`/app/invoices/${invoice.id}`"
                    size="xs"
                    variant="outline"
                    class="border-slate-300 text-slate-600 hover:bg-slate-50"
                    >Share</UButton
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filteredInvoices.length" class="px-8 py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <div
              class="h-16 w-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center"
            >
              <span class="text-2xl">📄</span>
            </div>
            <div>
              <p class="text-lg font-semibold text-slate-700 mb-2">
                No invoices found
              </p>
              <p class="text-sm text-slate-500">
                Create a new invoice or adjust your search filters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
