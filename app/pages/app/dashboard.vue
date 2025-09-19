<script setup lang="ts">
import { computed } from "vue";
import StatCard from "~/components/ui/StatCard.vue";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { formatCurrency, formatDate } from "~/utils/invoice-helpers";

const { profile } = useSession();
const { summary, overdueInvoices, invoicesDueSoon, recentInvoices, invoices } =
  useInvoices();
const { clients, clientsByProvider } = useClients();

const totalClients = computed(() => {
  const clientsArray = clients.value || [];
  return clientsArray.length === 0 ? 1 : clientsArray.length;
});

// Safe computed properties for arrays
const safeOverdueInvoices = computed(() => overdueInvoices.value || []);
const safeInvoicesDueSoon = computed(() => invoicesDueSoon.value || []);
const safeRecentInvoices = computed(() => recentInvoices.value || []);

const providerBreakdown = clientsByProvider;

const providerLabel = (provider: string) => {
  switch (provider) {
    case "mtn":
      return "MTN MoMo";
    case "vodafone":
      return "Vodafone Cash";
    case "airteltigo":
      return "AirtelTigo Money";
    default:
      return "Other";
  }
};

const clientName = (id: string) => {
  const invoicesArray = invoices.value || [];
  const clientsArray = clients.value || [];

  const inline = invoicesArray.find((invoice) => invoice.clientId === id);
  if (inline?.clientName) return inline.clientName;

  return clientsArray.find((client) => client.id === id)?.fullName ?? "Unknown";
};

const invoiceTotal = (invoiceId: string) => {
  const invoicesArray = invoices.value || [];
  const source = invoicesArray.find((invoice) => invoice.id === invoiceId);
  if (!source) return 0;
  if (typeof source.total === "number") return source.total;
  return (
    source.lineItems?.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    ) || 0
  );
};
</script>

<template>
  <div class="space-y-6 px-4 sm:px-0">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Revenue received"
        :value="formatCurrency(summary.totalRevenue, profile.currency)"
        sub-label="Paid invoices this month"
        accent="emerald"
      />
      <StatCard
        title="Outstanding"
        :value="formatCurrency(summary.outstanding, profile.currency)"
        :sub-label="`${summary.pendingCount} invoices awaiting payment`"
        accent="blue"
      />
      <StatCard
        title="Overdue invoices"
        :value="formatCurrency(summary.overdueTotal, profile.currency)"
        :sub-label="`${summary.overdueCount} require follow-up`"
        accent="rose"
      />
      <StatCard
        title="Active clients"
        :value="(clients.value || []).length.toString()"
        sub-label="Contacts receiving invoices"
        accent="amber"
      />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Attention Required Section -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Invoices that need attention
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Overdue follow-ups and payments due in the next three days.
              </p>
            </div>
            <UButton
              to="/app/invoices"
              color="primary"
              icon="i-heroicons-arrow-top-right-on-square"
              size="sm"
            >
              View all
            </UButton>
          </div>
        </div>

        <div class="card-body">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Overdue Section -->
            <div>
              <h4 class="text-sm font-semibold text-red-600 mb-3">Overdue</h4>

              <div v-if="safeOverdueInvoices.length" class="space-y-3">
                <div
                  v-for="invoice in safeOverdueInvoices"
                  :key="invoice.id"
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2"
                  >
                    <div>
                      <p class="text-sm font-semibold text-gray-900">
                        {{ invoice.invoiceNumber }}
                      </p>
                      <p class="text-xs text-red-600">
                        Due {{ formatDate(invoice.dueDate) }} •
                        {{ invoice.daysOverdue }} days overdue
                      </p>
                    </div>
                    <InvoiceStatusPill :status="invoice.status" />
                  </div>

                  <div class="flex flex-col sm:flex-row gap-2 mt-3">
                    <UButton
                      :to="`/app/invoices/${invoice.id}`"
                      size="xs"
                      variant="outline"
                      class="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Send reminder
                    </UButton>
                    <UButton
                      :to="`/app/invoices/${invoice.id}`"
                      size="xs"
                      variant="ghost"
                    >
                      Mark paid
                    </UButton>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-8 text-gray-500">
                <p class="text-sm">No overdue invoices</p>
              </div>
            </div>

            <!-- Due Soon Section -->
            <div>
              <h4 class="text-sm font-semibold text-amber-600 mb-3">
                Due in 3 days
              </h4>

              <div v-if="safeInvoicesDueSoon.length" class="space-y-3">
                <div
                  v-for="invoice in safeInvoicesDueSoon"
                  :key="`soon_${invoice.id}`"
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div
                    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <p class="text-sm font-semibold text-gray-900">
                        {{ invoice.invoiceNumber }}
                      </p>
                      <p class="text-xs text-amber-600">
                        Due {{ formatDate(invoice.dueDate) }} • in
                        {{ invoice.daysUntilDue }} days
                      </p>
                    </div>
                    <UButton
                      :to="`/app/invoices/${invoice.id}`"
                      color="gray"
                      variant="outline"
                      size="xs"
                      class="w-full sm:w-auto"
                    >
                      Prep reminder
                    </UButton>
                  </div>
                </div>
              </div>

              <div v-else class="text-center py-8 text-gray-500">
                <p class="text-sm">Nothing due soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Money Mix Section -->
      <div class="card">
        <div class="card-header">
          <h3 class="text-lg font-semibold text-gray-900">Mobile Money mix</h3>
          <p class="text-sm text-gray-600 mt-1">
            Understand how clients prefer to pay.
          </p>
        </div>

        <div class="card-body">
          <div class="space-y-4">
            <div
              v-for="(count, provider) in providerBreakdown"
              :key="provider"
              class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ providerLabel(provider) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ count }} client{{ count === 1 ? "" : "s" }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-gray-700"
                  >{{ Math.round((count / totalClients) * 100) }}%</span
                >
                <div class="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                  <div
                    class="h-full rounded-full bg-blue-600"
                    :style="{
                      width: `${Math.round((count / totalClients) * 100)}%`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p class="text-sm text-blue-800">
              <span class="font-semibold">Pro tip:</span> Clients paying via MTN
              settle invoices 36% faster. Prioritise MoMo payment links in
              reminders.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div class="card">
      <div class="card-header">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">Recent activity</h3>
            <p class="text-sm text-gray-600 mt-1">
              Latest invoices and their status across the workspace.
            </p>
          </div>
          <UButton
            to="/app/invoices"
            color="primary"
            icon="i-heroicons-arrow-top-right-on-square"
          >
            View all invoices
          </UButton>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table min-w-full">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Due date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in safeRecentInvoices" :key="invoice.id">
              <td>
                <NuxtLink
                  :to="`/app/invoices/${invoice.id}`"
                  class="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {{ invoice.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="text-gray-900">{{ clientName(invoice.clientId) }}</td>
              <td class="font-semibold text-gray-900">
                {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
              </td>
              <td><InvoiceStatusPill :status="invoice.status" /></td>
              <td class="text-gray-600">{{ formatDate(invoice.dueDate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
