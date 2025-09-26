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
  const statusFilter = activeStatus.value;
  const now = new Date();

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

    const matchesStatus = (() => {
      if (statusFilter === "all") return true;
      if (statusFilter === "overdue") {
        if (invoice.status === "paid") return false;
        if (invoice.status === "overdue") return true;
        if (!invoice.dueDate) return false;
        return new Date(invoice.dueDate) < now;
      }
      return invoice.status === statusFilter;
    })();

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
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 pb-24">
    <!-- Header Section -->
    <div
      class="bg-white/95 mb-5 rounded-lg backdrop-blur-md border-b border-slate-200"
    >
      <div class="px-4 py-6">
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                  />
                </svg>
              </div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600"
              >
                Invoices
              </p>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 mb-1">
              Manage every invoice with clarity
            </h1>
            <p class="text-sm text-slate-600">
              Filter by status, share reminders, and keep Paystack cashflow
              visible.
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3">
            <UButton
              color="primary"
              size="lg"
              class="w-full sm:w-auto bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-0 shadow-lg"
              :to="'/app/invoices/new'"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </template>
              Create invoice
            </UButton>
            <UButton
              variant="outline"
              color="neutral"
              size="lg"
              class="w-full sm:w-auto"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                  />
                </svg>
              </template>
              Export CSV
            </UButton>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div class="relative">
            <UInput
              v-model="searchTerm"
              icon="i-heroicons-magnifying-glass-20-solid"
              placeholder="Search invoices..."
              size="lg"
              class="rounded-lg"
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              v-for="stat in stats"
              :key="stat.key"
              :label="`${stat.label} (${stat.value})`"
              :variant="activeStatus === stat.key ? 'solid' : 'outline'"
              :color="activeStatus === stat.key ? 'primary' : 'neutral'"
              size="sm"
              class="rounded-full"
              @click="activeStatus = stat.key"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Invoices List -->
    <section
      class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-lg overflow-hidden shadow-xl shadow-slate-900/10"
    >
      <!-- Mobile View -->
      <div class="block sm:hidden">
        <div v-if="filteredInvoices.length" class="divide-y divide-blue-100/60">
          <div
            v-for="invoice in filteredInvoices"
            :key="invoice.id"
            class="p-6 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-blue-50/60 transition-all duration-300 group"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors group-hover:text-blue-700"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
                <p class="text-sm text-slate-600 mt-1 font-medium">
                  {{ clientName(invoice.clientId) }}
                </p>
              </div>
              <InvoiceStatusPill :status="invoice.status" />
            </div>

            <div class="flex items-center justify-between mb-4">
              <div>
                <p
                  class="text-xs text-slate-500 font-semibold uppercase tracking-wider"
                >
                  Amount
                </p>
                <p class="text-xl font-bold text-blue-600 mt-1">
                  {{
                    formatCurrency(invoiceAmount(invoice.id), profile.currency)
                  }}
                </p>
              </div>
              <div class="text-right">
                <p
                  class="text-xs text-slate-500 font-semibold uppercase tracking-wider"
                >
                  Due
                </p>
                <p class="text-sm font-bold text-slate-900 mt-1">
                  {{ formatDate(invoice.dueDate) }}
                </p>
              </div>
            </div>

            <div class="flex gap-3">
              <UButton
                :to="`/app/invoices/${invoice.id}`"
                size="sm"
                class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-blue-500/25 transition-all duration-300"
              >
                <template #leading>
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                    />
                  </svg>
                </template>
                Open
              </UButton>
              <UButton
                :to="`/app/invoices/${invoice.id}`"
                size="sm"
                variant="outline"
                class="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
              >
                <template #leading>
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"
                    />
                  </svg>
                </template>
                Share
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="px-8 py-16 text-center">
          <div class="flex flex-col items-center gap-6">
            <div
              class="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <svg
                class="w-8 h-8 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
              </svg>
            </div>
            <div>
              <p class="text-xl font-bold text-slate-800 mb-2">
                No invoices found
              </p>
              <p class="text-sm text-slate-500 leading-relaxed">
                Create a new invoice or adjust your search filters.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop View -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="min-w-full divide-y divide-blue-100/60 text-sm">
          <thead class="bg-gradient-to-r from-blue-50/80 to-blue-50/60">
            <tr>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Invoice
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Client
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Issued
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Due
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Amount
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Status
              </th>
              <th
                class="px-6 py-5 text-right text-xs font-bold uppercase tracking-[0.1em] text-blue-700"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-blue-100/40 bg-white">
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="group hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-blue-50/40 transition-all duration-300"
            >
              <td class="px-6 py-5 font-bold text-slate-900">
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-blue-600 hover:text-blue-700 transition-colors group-hover:text-blue-700"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="px-6 py-5 text-slate-700 font-semibold">
                {{ clientName(invoice.clientId) }}
              </td>
              <td class="px-6 py-5 text-slate-600 font-medium">
                {{ formatDate(invoice.issueDate) }}
              </td>
              <td class="px-6 py-5 text-slate-600 font-medium">
                {{ formatDate(invoice.dueDate) }}
              </td>
              <td class="px-6 py-5 text-blue-600 font-bold text-lg">
                {{
                  formatCurrency(invoiceAmount(invoice.id), profile.currency)
                }}
              </td>
              <td class="px-6 py-5">
                <InvoiceStatusPill :status="invoice.status" />
              </td>
              <td class="px-6 py-5 text-right">
                <div
                  class="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-all duration-300"
                >
                  <UButton
                    :to="`/app/invoices/${invoice.id}`"
                    size="xs"
                    class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md shadow-blue-500/25"
                  >
                    <template #leading>
                      <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                        />
                      </svg>
                    </template>
                    Open
                  </UButton>
                  <UButton
                    :to="`/app/invoices/${invoice.id}`"
                    size="xs"
                    variant="outline"
                    class="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <template #leading>
                      <svg
                        class="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"
                        />
                      </svg>
                    </template>
                    Share
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredInvoices.length" class="px-8 py-16 text-center">
          <div class="flex flex-col items-center gap-6">
            <div
              class="h-20 w-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center shadow-lg shadow-blue-500/20"
            >
              <svg
                class="w-8 h-8 text-blue-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                />
              </svg>
            </div>
            <div>
              <p class="text-xl font-bold text-slate-800 mb-2">
                No invoices found
              </p>
              <p class="text-sm text-slate-500 leading-relaxed">
                Create a new invoice or adjust your search filters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
