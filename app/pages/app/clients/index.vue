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
    [
      client.fullName,
      client.businessName ?? "",
      client.phone ?? "",
      client.email ?? "",
    ].some((field) => field.toLowerCase().includes(query))
  );
});

const clientStats = computed(() =>
  clients.value.map((client) => {
    const relatedInvoices = invoices.value.filter(
      (invoice) => invoice.clientId === client.id
    );
    const totalValue = relatedInvoices.reduce((sum, invoice) => {
      if (typeof invoice.total === "number") return sum + invoice.total;
      return (
        sum +
        invoice.lineItems.reduce(
          (acc, item) => acc + item.quantity * item.unitPrice,
          0
        )
      );
    }, 0);
    const paidCount = relatedInvoices.filter(
      (invoice) => invoice.status === "paid"
    ).length;
    return {
      id: client.id,
      totalValue,
      paidCount,
      totalInvoices: relatedInvoices.length,
    };
  })
);

const getClientStats = (clientId: string) =>
  clientStats.value.find((stat) => stat.id === clientId);

const selectClient = (client: ClientContact) => {
  selectedClient.value = client;
};
</script>

<template>
  <div class="flex flex-col">
    <section class="card rounded-3xl p-4 sm:p-6">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600"
          >
            Clients
          </p>
          <h2 class="mt-2 text-2xl font-semibold text-gray-900">
            Build stronger relationships
          </h2>
          <p class="text-sm text-gray-600">
            Centralise contacts, track invoice value, and tailor reminders.
          </p>
        </div>
        <UButton
          color="primary"
          icon="i-heroicons-user-plus"
          size="lg"
          class="w-full sm:w-auto"
        >
          Add client
        </UButton>
      </div>

      <UInput
        v-model="searchTerm"
        icon="i-heroicons-magnifying-glass-20-solid"
        placeholder="Search clients..."
        size="lg"
        class="mt-4"
      />
    </section>

    <div
      class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.6fr)]"
    >
      <div class="card rounded-3xl p-4 sm:p-5">
        <ul class="space-y-3">
          <li
            v-for="client in filteredClients"
            :key="client.id"
            :class="[
              'cursor-pointer rounded-2xl border px-4 py-3 transition-all',
              selectedClient?.id === client.id
                ? 'border-blue-300 bg-blue-50/70 text-blue-800 shadow'
                : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50/40 hover:text-gray-900',
            ]"
            @click="selectClient(client)"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold">{{ client.fullName }}</p>
                <p class="text-xs">{{ client.businessName || "Individual" }}</p>
              </div>
              <UBadge color="primary" variant="soft" size="xs">{{
                client.momoProvider.toUpperCase()
              }}</UBadge>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="selectedClient" class="space-y-6">
        <div class="card rounded-3xl p-4 sm:p-6">
          <div class="flex flex-col gap-1">
            <h3 class="text-xl font-semibold text-gray-900">
              {{ selectedClient.fullName }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ selectedClient.businessName || "Individual client" }}
            </p>
          </div>
          <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                WhatsApp
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.whatsappNumber || selectedClient.phone }}
              </p>
            </div>
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Email
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.email || "Not provided" }}
              </p>
            </div>
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Preferred mobile money network
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.momoProvider.toUpperCase() }}
              </p>
            </div>
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Notes
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.notes || "—" }}
              </p>
            </div>
          </div>
        </div>

        <div class="card rounded-3xl p-4 sm:p-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div
              class="rounded-2xl border border-gray-100 bg-white p-4 text-center"
            >
              <p class="text-xs text-gray-500">Invoices sent</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ getClientStats(selectedClient.id)?.totalInvoices || 0 }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-gray-100 bg-white p-4 text-center"
            >
              <p class="text-xs text-gray-500">Paid</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
              </p>
            </div>
            <div
              class="rounded-2xl border border-gray-100 bg-white p-4 text-center"
            >
              <p class="text-xs text-gray-500">Total value</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{
                  formatCurrency(
                    getClientStats(selectedClient.id)?.totalValue || 0,
                    "GHS"
                  )
                }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="card flex min-h-[320px] items-center justify-center rounded-3xl p-6 text-center text-sm text-gray-500"
      >
        Select a client to view contact details, mobile money preferences, and invoice
        performance.
      </div>
    </div>
  </div>
</template>
