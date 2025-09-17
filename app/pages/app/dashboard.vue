<script setup lang="ts">
import { computed } from "vue";
import StatCard from "~/components/ui/StatCard.vue";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { formatCurrency, formatDate, calculateInvoiceTotals } from "~/utils/invoice-helpers";

const { profile } = useSession();
const { summary, overdueInvoices, invoicesDueSoon, recentInvoices, invoices } = useInvoices();
const { clients, clientsByProvider } = useClients();

const totalClients = computed(() => (clients.value.length === 0 ? 1 : clients.value.length));
const providerBreakdown = computed(() => clientsByProvider.value);

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

const clientName = (id: string) => clients.value.find((client) => client.id === id)?.fullName ?? "Unknown";

const invoiceTotal = (invoiceId: string) => {
  const source = invoices.value.find((invoice) => invoice.id === invoiceId);
  if (!source) return 0;
  return calculateInvoiceTotals(source).grandTotal;
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-slate-900">Today at a glance</h2>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Revenue received"
          :value="formatCurrency(summary.totalRevenue, profile.currency)"
          sub-label="Paid invoices this month"
          accent="#16a34a"
        />
        <StatCard
          title="Outstanding"
          :value="formatCurrency(summary.outstanding, profile.currency)"
          :sub-label="`${summary.pendingCount} invoices awaiting payment`"
          accent="#1d4ed8"
        />
        <StatCard
          title="Overdue"
          :value="formatCurrency(summary.overdueTotal, profile.currency)"
          :sub-label="`${summary.overdueCount} need urgent follow-up`"
          accent="#b91c1c"
        />
      </div>
    </section>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
      <UCard
        :ui="{ body: 'space-y-5 p-6' }"
        class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Invoices needing attention</h3>
            <p class="text-sm text-slate-500">Follow up on overdue and due-soon invoices.</p>
          </div>
          <UButton to="/app/invoices" color="gray" variant="soft">View all</UButton>
        </div>

        <div v-if="overdueInvoices.length" class="space-y-3">
          <div
            v-for="invoice in overdueInvoices"
            :key="invoice.id"
            class="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-red-700">{{ invoice.invoiceNumber }}</p>
              <p class="text-xs text-red-600">
                Due {{ formatDate(invoice.dueDate) }} • {{ invoice.daysOverdue }} days overdue
              </p>
            </div>
            <InvoiceStatusPill :status="invoice.status" />
          </div>
        </div>
        <p v-else class="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-600">
          No overdue invoices. Great job! 🎉
        </p>

        <div v-if="invoicesDueSoon.length" class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Due in next 3 days</p>
          <div
            v-for="invoice in invoicesDueSoon"
            :key="`soon_${invoice.id}`"
            class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ invoice.invoiceNumber }}</p>
              <p class="text-xs text-slate-500">
                Due {{ formatDate(invoice.dueDate) }} • in {{ invoice.daysUntilDue }} days
              </p>
            </div>
            <UButton :to="`/app/invoices/${invoice.id}`" color="gray" variant="ghost" size="sm">Remind</UButton>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'space-y-4 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Mobile Money mix</h3>
          <p class="text-sm text-slate-500">See which providers your clients prefer.</p>
        </div>
        <ul class="space-y-3">
          <li
            v-for="(count, provider) in providerBreakdown"
            :key="provider"
            class="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ providerLabel(provider) }}</p>
              <p class="text-xs text-slate-500">{{ count }} client{{ count === 1 ? '' : 's' }}</p>
            </div>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {{ Math.round((count / totalClients) * 100) }}%
            </span>
          </li>
        </ul>
      </UCard>
    </section>

    <section>
      <UCard :ui="{ body: 'space-y-5 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 class="text-base font-semibold text-slate-900">Recent invoices</h3>
            <p class="text-sm text-slate-500">Keep tabs on the most recent activity.</p>
          </div>
          <UButton to="/app/invoices" color="gray" variant="soft">Go to invoices</UButton>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-100">
          <table class="min-w-full divide-y divide-slate-100 text-sm">
            <thead class="bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">Invoice</th>
                <th class="px-4 py-3 text-left font-semibold">Client</th>
                <th class="px-4 py-3 text-left font-semibold">Amount</th>
                <th class="px-4 py-3 text-left font-semibold">Status</th>
                <th class="px-4 py-3 text-left font-semibold">Due date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white/60">
              <tr v-for="invoice in recentInvoices" :key="invoice.id" class="hover:bg-slate-50/80">
                <td class="px-4 py-3 font-medium text-slate-900">
                  <NuxtLink :to="`/app/invoices/${invoice.id}`" class="text-amber-600 hover:text-amber-700">
                    {{ invoice.invoiceNumber }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-3 text-slate-600">{{ clientName(invoice.clientId) }}</td>
                <td class="px-4 py-3 text-slate-900">
                  {{ formatCurrency(invoiceTotal(invoice.id), profile.currency) }}
                </td>
                <td class="px-4 py-3">
                  <InvoiceStatusPill :status="invoice.status" />
                </td>
                <td class="px-4 py-3 text-slate-600">{{ formatDate(invoice.dueDate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </section>
  </div>
</template>
