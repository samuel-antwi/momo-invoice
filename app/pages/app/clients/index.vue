<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useClients } from "~/composables/useClients";
import { useInvoices } from "~/composables/useInvoices";
import { formatCurrency, calculateInvoiceTotals } from "~/utils/invoice-helpers";
import type { ClientContact } from "~/types/models";

const { clients } = useClients();
const { invoices } = useInvoices();

const searchTerm = ref("");
const selectedClient = ref<ClientContact | null>(null);

watchEffect(() => {
  if (!selectedClient.value && clients.value.length) {
    selectedClient.value = clients.value[0];
  }
});

const filteredClients = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  if (!query) return clients.value;

  return clients.value.filter((client) =>
    [client.fullName, client.businessName ?? "", client.phone ?? "", client.email ?? ""].some((field) =>
      field.toLowerCase().includes(query),
    ),
  );
});

const clientStats = computed(() =>
  clients.value.map((client) => {
    const relatedInvoices = invoices.value.filter((invoice) => invoice.clientId === client.id);
    const totalValue = relatedInvoices.reduce((sum, invoice) => sum + calculateInvoiceTotals(invoice).grandTotal, 0);
    const paidCount = relatedInvoices.filter((invoice) => invoice.status === "paid").length;
    return {
      id: client.id,
      totalValue,
      paidCount,
      totalInvoices: relatedInvoices.length,
    };
  }),
);

const getClientStats = (clientId: string) => clientStats.value.find((stat) => stat.id === clientId);

const selectClient = (client: ClientContact) => {
  selectedClient.value = client;
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-slate-900">Clients</h2>
        <p class="text-sm text-slate-500">Keep your customer details and contact channels organised.</p>
      </div>
      <UButton color="primary" icon="i-heroicons-user-plus">Add client</UButton>
    </section>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.9fr)]">
      <UCard :ui="{ body: 'space-y-4 p-5' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <UInput
          v-model="searchTerm"
          icon="i-heroicons-magnifying-glass-20-solid"
          placeholder="Search clients"
          size="lg"
        />

        <ul class="space-y-2">
          <li
            v-for="client in filteredClients"
            :key="client.id"
            :class="[
              'flex items-center justify-between rounded-2xl border px-4 py-3 transition-all',
              selectedClient?.id === client.id
                ? 'border-amber-300 bg-amber-50/80 text-amber-800'
                : 'border-slate-100 bg-white/80 text-slate-600 hover:border-amber-200 hover:bg-amber-50/50 hover:text-slate-900',
            ]"
            @click="selectClient(client)"
          >
            <div>
              <p class="text-sm font-semibold">{{ client.fullName }}</p>
              <p class="text-xs">{{ client.businessName || 'Individual' }}</p>
            </div>
            <UBadge color="primary" variant="soft" size="xs">{{ client.momoProvider.toUpperCase() }}</UBadge>
          </li>
        </ul>
      </UCard>

      <UCard
        v-if="selectedClient"
        :ui="{ body: 'space-y-6 p-6' }"
        class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100"
      >
        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-slate-900">{{ selectedClient.fullName }}</h3>
          <p class="text-sm text-slate-500">{{ selectedClient.businessName || 'Individual client' }}</p>
        </div>

        <div class="grid gap-6 sm:grid-cols-2">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone / WhatsApp</p>
            <p class="text-sm text-slate-900">{{ selectedClient.whatsappNumber || selectedClient.phone }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
            <p class="text-sm text-slate-900">{{ selectedClient.email || 'Not provided' }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred MoMo</p>
            <p class="text-sm text-slate-900">{{ selectedClient.momoProvider.toUpperCase() }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
            <p class="text-sm text-slate-900">{{ selectedClient.notes || '—' }}</p>
          </div>
        </div>

        <div class="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoices sent</p>
            <p class="mt-1 text-xl font-semibold text-slate-900">
              {{ getClientStats(selectedClient.id)?.totalInvoices || 0 }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</p>
            <p class="mt-1 text-xl font-semibold text-slate-900">
              {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total value</p>
            <p class="mt-1 text-xl font-semibold text-slate-900">
              {{ formatCurrency(getClientStats(selectedClient.id)?.totalValue || 0, 'GHS') }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard
        v-else
        :ui="{ body: 'space-y-3 p-6 text-center' }"
        class="flex min-h-[320px] flex-col items-center justify-center border border-dashed border-slate-200 bg-white/70"
      >
        <h3 class="text-lg font-semibold text-slate-900">Select a client</h3>
        <p class="text-sm text-slate-500">Review contact details, invoice history, and conversation notes.</p>
      </UCard>
    </div>
  </div>
</template>
