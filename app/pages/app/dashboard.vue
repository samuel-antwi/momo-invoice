<script setup lang="ts">
import { computed, ref } from "vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { formatCurrency, formatDate } from "~/utils/invoice-helpers";

const { profile } = useSession();
const { summary, overdueInvoices, invoicesDueSoon, recentInvoices, invoices } = useInvoices();
const { clients, clientsByProvider } = useClients();

// Animation control
const showContent = ref(false);
onMounted(() => {
  setTimeout(() => {
    showContent.value = true;
  }, 50);
});

const totalClients = computed(() => Math.max(summary.value.activeClients, 1));

// Safe computed properties
const safeOverdueInvoices = computed(() => overdueInvoices.value || []);
const safeInvoicesDueSoon = computed(() => invoicesDueSoon.value || []);
const safeRecentInvoices = computed(() => recentInvoices.value || []);

// Combine action items without duplicates
const actionItems = computed(() => {
  const overdue = safeOverdueInvoices.value.slice(0, 2);
  const dueSoon = safeInvoicesDueSoon.value.slice(0, 2);
  const combined = [...overdue];

  // Add invoices from dueSoon that aren't already in overdue
  for (const invoice of dueSoon) {
    if (!combined.find(item => item.id === invoice.id)) {
      combined.push(invoice);
    }
  }

  return combined.slice(0, 4); // Limit to 4 items total
});

// Greeting based on time
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
});

// Format large numbers
const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
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
  return source.lineItems?.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) || 0;
};

// Calculate trend (mock data for now)
const revenueChange = computed(() => {
  const change = 12.5; // You can calculate this from actual data
  return {
    value: change,
    isPositive: change > 0
  };
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Clean Header Section -->
    <div class="bg-white border-b border-gray-200">
      <div class="px-4 py-6 sm:px-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">
              {{ greeting }}, {{ profile.businessName?.split(' ')[0] || "there" }}
            </h1>
            <p class="mt-1 text-sm text-gray-600">
              {{ new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }}
            </p>
          </div>

          <!-- Quick Actions - Desktop -->
          <div class="hidden sm:flex items-center gap-3">
            <UButton
              to="/app/invoices/new"
              color="primary"
              icon="i-heroicons-plus"
            >
              New Invoice
            </UButton>
            <UButton
              to="/app/clients"
              variant="outline"
              color="gray"
              icon="i-heroicons-user-plus"
            >
              Add Client
            </UButton>
          </div>
        </div>

        <!-- Mobile Quick Actions -->
        <div class="mt-4 flex gap-2 sm:hidden">
          <UButton
            to="/app/invoices/new"
            color="primary"
            size="sm"
            icon="i-heroicons-plus"
            class="flex-1"
          >
            New Invoice
          </UButton>
          <UButton
            to="/app/clients"
            variant="outline"
            color="gray"
            size="sm"
            icon="i-heroicons-user-plus"
            class="flex-1"
          >
            Add Client
          </UButton>
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="px-4 py-6 sm:px-6">
      <!-- Primary Metric Card -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600">Total Revenue</p>
            <div class="mt-2 flex items-baseline gap-2">
              <p class="text-3xl font-semibold text-gray-900">
                {{ formatCurrency(summary.totalRevenue, profile.currency) }}
              </p>
              <span
                v-if="revenueChange.value"
                class="text-sm font-medium"
                :class="revenueChange.isPositive ? 'text-green-600' : 'text-red-600'"
              >
                {{ revenueChange.isPositive ? '+' : '' }}{{ revenueChange.value }}%
              </span>
            </div>
            <p class="mt-1 text-sm text-gray-500">This month</p>
          </div>
          <div class="p-3 bg-green-50 rounded-lg">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Secondary Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <!-- Unpaid (All) -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="p-2 bg-blue-50 rounded">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-500">Unpaid</span>
          </div>
          <p class="text-2xl font-semibold text-gray-900">{{ summary.unpaidCount || 0 }}</p>
          <p class="text-xs text-gray-600 mt-1">
            {{ formatCurrency(summary.outstanding, profile.currency) }}
          </p>
        </div>

        <!-- Overdue -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="p-2 bg-red-50 rounded">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-500">Overdue</span>
          </div>
          <p class="text-2xl font-semibold text-gray-900">{{ summary.overdueCount }}</p>
          <p class="text-xs text-gray-600 mt-1">
            {{ formatCurrency(summary.overdueTotal, profile.currency) }}
          </p>
        </div>

        <!-- Paid -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="p-2 bg-green-50 rounded">
              <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-500">Paid</span>
          </div>
          <p class="text-2xl font-semibold text-gray-900">{{ summary.paidCount }}</p>
          <p class="text-xs text-gray-600 mt-1">This month</p>
        </div>

        <!-- Clients -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="p-2 bg-purple-50 rounded">
              <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span class="text-xs font-medium text-gray-500">Active</span>
          </div>
          <p class="text-2xl font-semibold text-gray-900">{{ summary.activeClients }}</p>
          <p class="text-xs text-gray-600 mt-1">Clients</p>
        </div>
      </div>

      <!-- Action Required Section -->
      <div v-if="actionItems.length > 0" class="mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <h3 class="text-sm font-medium text-gray-900">Action Required</h3>
                <span class="text-xs text-gray-500">({{ actionItems.length }})</span>
              </div>
              <UButton
                to="/app/invoices"
                variant="ghost"
                color="gray"
                size="xs"
              >
                View all
              </UButton>
            </div>
          </div>

          <div class="divide-y divide-gray-200">
            <!-- Priority items -->
            <div
              v-for="invoice in actionItems"
              :key="invoice.id"
              class="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              @click="$router.push(`/app/invoices/${invoice.id}`)"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm text-gray-900">{{ invoice.invoiceNumber }}</span>
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      :class="{
                        'bg-red-100 text-red-800': invoice.status === 'overdue' || invoice.daysOverdue,
                        'bg-yellow-100 text-yellow-800': invoice.daysUntilDue && invoice.daysUntilDue <= 3
                      }"
                    >
                      {{ invoice.daysOverdue ? `${invoice.daysOverdue}d overdue` : `Due in ${invoice.daysUntilDue}d` }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ clientName(invoice.clientId) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
                  </p>
                  <UButton
                    size="xs"
                    variant="soft"
                    :color="invoice.daysOverdue ? 'red' : 'yellow'"
                    class="mt-2"
                    @click.stop="$router.push(`/app/invoices/${invoice.id}`)"
                  >
                    {{ invoice.daysOverdue ? 'Send reminder' : 'Review' }}
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Invoices -->
      <div class="mb-6">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-medium text-gray-900">Recent Invoices</h3>
              <UButton
                to="/app/invoices"
                variant="ghost"
                color="gray"
                size="xs"
              >
                View all
              </UButton>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="invoice in safeRecentInvoices.slice(0, 5)"
                  :key="invoice.id"
                  class="hover:bg-gray-50 cursor-pointer"
                  @click="$router.push(`/app/invoices/${invoice.id}`)"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                      {{ invoice.invoiceNumber }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-sm text-gray-900">{{ clientName(invoice.clientId) }}</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-sm font-medium text-gray-900">
                      {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="{
                        'bg-green-100 text-green-800': invoice.status === 'paid',
                        'bg-blue-100 text-blue-800': invoice.status === 'sent',
                        'bg-gray-100 text-gray-800': invoice.status === 'draft',
                        'bg-red-100 text-red-800': invoice.status === 'overdue'
                      }"
                    >
                      {{ invoice.status }}
                    </span>
                  </td>
                  <td class="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(invoice.issueDate) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Payment Providers Summary -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-sm font-medium text-gray-900">Payment Methods Distribution</h3>
        </div>
        <div class="p-4">
          <div class="space-y-3">
            <div v-for="(count, provider) in clientsByProvider" :key="provider" class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-700': provider === 'mtn',
                    'bg-red-100 text-red-700': provider === 'vodafone',
                    'bg-blue-100 text-blue-700': provider === 'airteltigo',
                    'bg-gray-100 text-gray-700': provider === 'other'
                  }"
                >
                  {{ provider === 'mtn' ? 'MTN' : provider === 'vodafone' ? 'VOD' : provider === 'airteltigo' ? 'AT' : 'OTH' }}
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">
                    {{ provider === 'mtn' ? 'MTN Mobile Money' : provider === 'vodafone' ? 'Vodafone Cash' : provider === 'airteltigo' ? 'AirtelTigo Money' : 'Other' }}
                  </p>
                  <p class="text-xs text-gray-500">{{ count }} client{{ count !== 1 ? 's' : '' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900">{{ Math.round((count / totalClients) * 100) }}%</span>
                <div class="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="{
                      'bg-yellow-500': provider === 'mtn',
                      'bg-red-500': provider === 'vodafone',
                      'bg-blue-500': provider === 'airteltigo',
                      'bg-gray-500': provider === 'other'
                    }"
                    :style="{ width: `${Math.round((count / totalClients) * 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile FAB -->
    <div class="fixed bottom-6 right-6 sm:hidden">
      <UButton
        to="/app/invoices/new"
        color="primary"
        size="lg"
        icon="i-heroicons-plus"
        class="rounded-full shadow-lg h-14 w-14"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>