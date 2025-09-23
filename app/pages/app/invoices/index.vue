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
  <div class="flex flex-col gap-6 animate-fade-in sm:px-0">
    <section class="card rounded-3xl p-4 sm:p-8">
      <div
        class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-sm">📄</span>
            </div>
            <p class="text-sm font-bold uppercase tracking-wider text-blue-600">
              Invoices
            </p>
          </div>
          <h2 class="text-3xl font-bold text-gray-900">
            Manage every invoice with clarity
          </h2>
          <p class="text-sm text-gray-600 leading-relaxed">
            Filter by status, share reminders, and keep MoMo cashflow visible.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3">
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            size="lg"
            class="w-full sm:w-auto"
            :to="'/app/invoices/new'"
          >
            Create invoice
          </UButton>
          <UButton
            variant="outline"
            color="gray"
            icon="i-heroicons-arrow-down-tray"
            size="lg"
            class="w-full sm:w-auto"
          >
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
            :variant="activeStatus.value === stat.key ? 'solid' : 'outline'"
            :color="activeStatus.value === stat.key ? 'primary' : 'gray'"
            size="sm"
            class="rounded-full"
            @click="activeStatus.value = stat.key"
          />
        </div>
      </div>
    </section>

    <!-- Invoices List -->
    <section class="card rounded-3xl overflow-hidden animate-slide-up">
      <!-- Mobile View -->
      <div class="block sm:hidden">
        <div v-if="filteredInvoices.length" class="divide-y divide-gray-100">
          <div
            v-for="invoice in filteredInvoices"
            :key="invoice.id"
            class="p-4 hover:bg-blue-50/30 transition-colors"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-lg font-bold text-blue-600 hover:text-blue-700"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
                <p class="text-sm text-gray-600 mt-1">
                  {{ clientName(invoice.clientId) }}
                </p>
              </div>
              <InvoiceStatusPill :status="invoice.status" />
            </div>

            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-xs text-gray-500">Amount</p>
                <p class="text-lg font-bold text-gray-900">
                  {{
                    formatCurrency(invoiceAmount(invoice.id), profile.currency)
                  }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-gray-500">Due</p>
                <p class="text-sm font-medium text-gray-900">
                  {{ formatDate(invoice.dueDate) }}
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                :to="`/app/invoices/${invoice.id}`"
                size="sm"
                color="primary"
                class="flex-1"
              >
                Open
              </UButton>
              <UButton
                :to="`/app/invoices/${invoice.id}`"
                size="sm"
                variant="outline"
                color="gray"
                class="flex-1"
              >
                Share
              </UButton>
            </div>
          </div>
        </div>

        <div v-else class="px-4 py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <div
              class="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <span class="text-2xl">📄</span>
            </div>
            <div>
              <p class="text-lg font-semibold text-gray-700 mb-2">
                No invoices found
              </p>
              <p class="text-sm text-gray-500">
                Create a new invoice or adjust your search filters.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop View -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-100 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Invoice
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Client
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Issued
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Due
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Amount
              </th>
              <th
                class="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Status
              </th>
              <th
                class="px-6 py-5 text-right text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            <tr
              v-for="invoice in filteredInvoices"
              :key="invoice.id"
              class="group hover:bg-blue-50/30 transition-all duration-200"
            >
              <td class="px-6 py-5 font-bold text-gray-900">
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="px-6 py-5 text-gray-700 font-medium">
                {{ clientName(invoice.clientId) }}
              </td>
              <td class="px-6 py-5 text-gray-600">
                {{ formatDate(invoice.issueDate) }}
              </td>
              <td class="px-6 py-5 text-gray-600">
                {{ formatDate(invoice.dueDate) }}
              </td>
              <td class="px-6 py-5 text-gray-900 font-semibold">
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
                    color="primary"
                  >
                    Open
                  </UButton>
                  <UButton
                    :to="`/app/invoices/${invoice.id}`"
                    size="xs"
                    variant="outline"
                    color="gray"
                  >
                    Share
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!filteredInvoices.length" class="px-8 py-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <div
              class="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <span class="text-2xl">📄</span>
            </div>
            <div>
              <p class="text-lg font-semibold text-gray-700 mb-2">
                No invoices found
              </p>
              <p class="text-sm text-gray-500">
                Create a new invoice or adjust your search filters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
