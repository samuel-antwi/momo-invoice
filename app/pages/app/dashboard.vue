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

const totalClients = computed(() => Math.max(summary.value.activeClients, 1));

// Safe computed properties for arrays
const safeOverdueInvoices = computed(() => overdueInvoices.value || []);
const safeInvoicesDueSoon = computed(() => invoicesDueSoon.value || []);
const safeRecentInvoices = computed(() => recentInvoices.value || []);

const providerBreakdown = clientsByProvider;

const providerLabel = (provider: string) => {
  switch (provider) {
    case "mtn":
      return "MTN via Paystack";
    case "vodafone":
      return "Vodafone via Paystack";
    case "airteltigo":
      return "AirtelTigo via Paystack";
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
  <div class="space-y-6">
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
        :value="summary.activeClients.toString()"
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
          <!-- Combined Table View for Better Scalability -->
          <div v-if="safeOverdueInvoices.length || safeInvoicesDueSoon.length" class="overflow-x-auto">
            <table class="table min-w-full">
              <thead>
                <tr>
                  <th class="text-left">Invoice</th>
                  <th class="text-left">Client</th>
                  <th class="text-right">Amount</th>
                  <th class="text-left">Status</th>
                  <th class="text-center">Priority</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <!-- Overdue Invoices (Higher Priority) -->
                <tr
                  v-for="invoice in safeOverdueInvoices.slice(0, 5)"
                  :key="`overdue_${invoice.id}`"
                  class="hover:bg-red-50 border-l-4 border-l-red-500"
                >
                  <td>
                    <div>
                      <NuxtLink
                        :to="`/app/invoices/${invoice.id}`"
                        class="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {{ invoice.invoiceNumber }}
                      </NuxtLink>
                      <p class="text-xs text-red-600 mt-1">
                        {{ invoice.daysOverdue }} days overdue
                      </p>
                    </div>
                  </td>
                  <td class="text-gray-900">{{ clientName(invoice.clientId) }}</td>
                  <td class="text-right font-semibold">
                    {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
                  </td>
                  <td><InvoiceStatusPill :status="invoice.status" /></td>
                  <td class="text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      🚨 OVERDUE
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="flex items-center justify-center gap-1">
                      <UButton
                        :to="`/app/invoices/${invoice.id}`"
                        size="xs"
                        color="red"
                        variant="outline"
                      >
                        Send reminder
                      </UButton>
                    </div>
                  </td>
                </tr>

                <!-- Due Soon Invoices -->
                <tr
                  v-for="invoice in safeInvoicesDueSoon.slice(0, 5)"
                  :key="`due_soon_${invoice.id}`"
                  class="hover:bg-amber-50 border-l-4 border-l-amber-400"
                >
                  <td>
                    <div>
                      <NuxtLink
                        :to="`/app/invoices/${invoice.id}`"
                        class="font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {{ invoice.invoiceNumber }}
                      </NuxtLink>
                      <p class="text-xs text-amber-600 mt-1">
                        Due in {{ invoice.daysUntilDue }} days
                      </p>
                    </div>
                  </td>
                  <td class="text-gray-900">{{ clientName(invoice.clientId) }}</td>
                  <td class="text-right font-semibold">
                    {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
                  </td>
                  <td><InvoiceStatusPill :status="invoice.status" /></td>
                  <td class="text-center">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      ⚠️ DUE SOON
                    </span>
                  </td>
                  <td class="text-center">
                    <UButton
                      :to="`/app/invoices/${invoice.id}`"
                      size="xs"
                      color="amber"
                      variant="outline"
                    >
                      Prep reminder
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Show More Link if there are additional invoices -->
            <div
              v-if="safeOverdueInvoices.length > 5 || safeInvoicesDueSoon.length > 5"
              class="mt-4 text-center"
            >
              <UButton
                to="/app/invoices?filter=attention"
                color="gray"
                variant="outline"
                size="sm"
              >
                Show {{ (safeOverdueInvoices.length - 5) + (safeInvoicesDueSoon.length - 5) }} more invoices needing attention
              </UButton>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <div class="w-12 h-12 mx-auto mb-4 text-green-500">
              ✅
            </div>
            <p class="text-lg font-semibold text-gray-900 mb-2">All caught up!</p>
            <p class="text-sm text-gray-600">No invoices need immediate attention.</p>
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
              settle invoices 36% faster. Prioritise Paystack payment links in
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
