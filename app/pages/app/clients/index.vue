<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useClients } from "~/composables/useClients";
import { useInvoices } from "~/composables/useInvoices";
import { formatCurrency } from "~/utils/invoice-helpers";
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
    const totalValue = relatedInvoices.reduce((sum, invoice) => {
      if (typeof invoice.total === "number") return sum + invoice.total;
      return sum + invoice.lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    }, 0);
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
  <div class="flex flex-col gap-8">
    <section class="glass-panel rounded-3xl p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">Clients</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">Build stronger relationships</h2>
          <p class="text-sm text-slate-500">Centralise contacts, track invoice value, and tailor reminders.</p>
        </div>
        <UButton color="primary" icon="i-heroicons-user-plus" size="lg">Add client</UButton>
      </div>

      <UInput
        v-model="searchTerm"
        icon="i-heroicons-magnifying-glass-20-solid"
        placeholder="Search clients by name, business or phone"
        size="lg"
        class="mt-6 rounded-2xl border border-slate-200/70 bg-white/85"
      />
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.6fr)]">
      <div class="glass-panel rounded-3xl p-5">
        <ul class="space-y-3">
          <li
            v-for="client in filteredClients"
            :key="client.id"
            :class="[
              'cursor-pointer rounded-2xl border px-4 py-3 transition-all',
              selectedClient?.id === client.id
                ? 'border-amber-300 bg-amber-50/70 text-amber-800 shadow'
                : 'border-slate-100 bg-white/90 text-slate-600 hover:border-amber-200 hover:bg-amber-50/40 hover:text-slate-900',
            ]"
            @click="selectClient(client)"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">{{ client.fullName }}</p>
                <p class="text-xs">{{ client.businessName || 'Individual' }}</p>
              </div>
              <UBadge color="primary" variant="soft" size="xs">{{ client.momoProvider.toUpperCase() }}</UBadge>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="selectedClient" class="space-y-6">
        <div class="glass-panel rounded-3xl p-6">
          <div class="flex flex-col gap-1">
            <h3 class="text-xl font-semibold text-slate-900">{{ selectedClient.fullName }}</h3>
            <p class="text-sm text-slate-500">{{ selectedClient.businessName || 'Individual client' }}</p>
          </div>
          <div class="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">WhatsApp</p>
              <p class="text-sm text-slate-900">{{ selectedClient.whatsappNumber || selectedClient.phone }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p class="text-sm text-slate-900">{{ selectedClient.email || 'Not provided' }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Preferred MoMo</p>
              <p class="text-sm text-slate-900">{{ selectedClient.momoProvider.toUpperCase() }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
              <p class="text-sm text-slate-900">{{ selectedClient.notes || '—' }}</p>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Invoices sent</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ getClientStats(selectedClient.id)?.totalInvoices || 0 }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Paid</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Total value</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ formatCurrency(getClientStats(selectedClient.id)?.totalValue || 0, 'GHS') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="glass-panel flex min-h-[320px] items-center justify-center rounded-3xl p-6 text-center text-sm text-slate-500">
        Select a client to view contact details, MoMo preferences, and invoice performance.
      </div>
    </div>
  </div>
</template>
