<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect, useId } from "vue";
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui/dist/runtime/types";

import { useClients } from "~/composables/useClients";
import { useInvoices } from "~/composables/useInvoices";
import { formatCurrency } from "~/utils/invoice-helpers";
import type { ClientContact, CreateClientPayload } from "~/types/models";

const { clients, createClient, updateClient } = useClients();
const { invoices } = useInvoices();

const toast = useToast();

const searchTerm = ref("");
const selectedClient = ref<ClientContact | null>(null);

const clientFormId = useId();
const isClientDrawerOpen = ref(false);
const drawerMode = ref<"create" | "edit">("create");
const isSavingClient = ref(false);
const editingClientId = ref<string | null>(null);

const momoProviderOptions = [
  { label: "MTN Mobile Money", value: "mtn" },
  { label: "Vodafone Cash", value: "vodafone" },
  { label: "AirtelTigo Money", value: "airteltigo" },
  { label: "Other", value: "other" },
];

const optionalTrimmed = () =>
  z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return undefined;
    });

const clientSchema = z.object({
  fullName: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Client name is required")),
  businessName: optionalTrimmed(),
  email: optionalTrimmed().refine(
    (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    { message: "Enter a valid email" },
  ),
  phone: optionalTrimmed().refine(
    (value) => !value || value.length >= 3,
    { message: "Enter a valid phone number" },
  ),
  whatsappNumber: optionalTrimmed().refine(
    (value) => !value || value.length >= 3,
    { message: "Enter a valid WhatsApp number" },
  ),
  momoProvider: z.enum(["mtn", "vodafone", "airteltigo", "other"]).default("mtn"),
  notes: optionalTrimmed().refine(
    (value) => !value || value.length <= 1000,
    { message: "Notes must be 1000 characters or less" },
  ),
});

type ClientFormInput = z.input<typeof clientSchema>;
type ClientFormSubmit = z.output<typeof clientSchema>;

const clientFormState = reactive<ClientFormInput>({
  fullName: "",
  businessName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  momoProvider: "mtn",
  notes: "",
});

const formGroupUi = {
  label: "text-sm font-medium text-slate-700",
  description: "text-xs text-slate-500",
  wrapper: "space-y-2",
};

const isEditMode = computed(() => drawerMode.value === "edit");
const clientDrawerTitle = computed(() =>
  isEditMode.value ? "Edit client" : "Add client",
);
const clientDrawerDescription = computed(() =>
  isEditMode.value
    ? "Update the contact details your invoices and reminders rely on."
    : "Store a new client so you can invoice and send payment reminders quickly.",
);
const clientSubmitLabel = computed(() =>
  isEditMode.value ? "Save changes" : "Add client",
);

watchEffect(() => {
  if (!selectedClient.value && clients.value.length) {
    selectedClient.value = clients.value[0];
  }
});

watch(
  clients,
  (list) => {
    if (!selectedClient.value) return;
    const match = list.find((client) => client.id === selectedClient.value?.id);
    if (match) {
      selectedClient.value = match;
    }
  },
  { deep: false },
);

const filteredClients = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  if (!query) return clients.value;

  return clients.value.filter((client) =>
    [
      client.fullName,
      client.businessName ?? "",
      client.phone ?? "",
      client.email ?? "",
    ].some((field) => field.toLowerCase().includes(query)),
  );
});

const clientStats = computed(() =>
  clients.value.map((client) => {
    const relatedInvoices = invoices.value.filter((invoice) => invoice.clientId === client.id);
    const totalValue = relatedInvoices.reduce((sum, invoice) => {
      if (typeof invoice.total === "number") return sum + invoice.total;
      return (
        sum +
        invoice.lineItems.reduce(
          (acc, item) => acc + item.quantity * item.unitPrice,
          0,
        )
      );
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

const getClientStats = (clientId: string) =>
  clientStats.value.find((stat) => stat.id === clientId);

const selectClient = (client: ClientContact) => {
  selectedClient.value = client;
};

const resetClientForm = () => {
  clientFormState.fullName = "";
  clientFormState.businessName = "";
  clientFormState.email = "";
  clientFormState.phone = "";
  clientFormState.whatsappNumber = "";
  clientFormState.momoProvider = "mtn";
  clientFormState.notes = "";
};

const populateClientForm = (client: ClientContact) => {
  clientFormState.fullName = client.fullName;
  clientFormState.businessName = client.businessName ?? "";
  clientFormState.email = client.email ?? "";
  clientFormState.phone = client.phone ?? "";
  clientFormState.whatsappNumber = client.whatsappNumber ?? "";
  clientFormState.momoProvider = client.momoProvider;
  clientFormState.notes = client.notes ?? "";
};

const openCreateClient = () => {
  resetClientForm();
  drawerMode.value = "create";
  editingClientId.value = null;
  isClientDrawerOpen.value = true;
};

const openEditClient = () => {
  if (!selectedClient.value) {
    toast.add({
      title: "Select a client first",
      description: "Pick a client from the list before editing.",
      color: "amber",
    });
    return;
  }

  populateClientForm(selectedClient.value);
  drawerMode.value = "edit";
  editingClientId.value = selectedClient.value.id;
  isClientDrawerOpen.value = true;
};

watch(isClientDrawerOpen, (open) => {
  if (!open) {
    resetClientForm();
    editingClientId.value = null;
    drawerMode.value = "create";
  }
});

const handleClientSubmit = async (event: FormSubmitEvent<ClientFormSubmit>) => {
  if (isSavingClient.value) return;
  isSavingClient.value = true;

  const payload: CreateClientPayload = {
    fullName: event.data.fullName,
    businessName: event.data.businessName,
    email: event.data.email,
    phone: event.data.phone,
    whatsappNumber: event.data.whatsappNumber,
    momoProvider: event.data.momoProvider,
    notes: event.data.notes,
  };

  try {
    if (isEditMode.value && editingClientId.value) {
      const updated = await updateClient(editingClientId.value, payload);
      toast.add({
        title: "Client updated",
        description: `${updated.fullName}'s details were saved.`,
        color: "emerald",
      });
      selectedClient.value = updated;
    } else {
      const created = await createClient(payload);
      toast.add({
        title: "Client added",
        description: `${created.fullName} is ready for invoicing.`,
        color: "emerald",
      });
      selectedClient.value = created;
    }

    isClientDrawerOpen.value = false;
  } catch (error) {
    const validation = (error as { data?: { errors?: Record<string, string[]> } }).data?.errors;
    const serverMessage = validation ? Object.values(validation).flat()[0] : undefined;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to save client",
      description: serverMessage || fallback || "Please try again in a few minutes.",
      color: "red",
    });
  } finally {
    isSavingClient.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col">
    <section class="card rounded-3xl p-4 sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-blue-600">
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
          @click="openCreateClient"
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

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1.6fr)]">
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
              <UBadge color="primary" variant="soft" size="xs">
                {{ client.momoProvider.toUpperCase() }}
              </UBadge>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="selectedClient" class="space-y-6">
        <div class="card rounded-3xl p-4 sm:p-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-1">
              <h3 class="text-xl font-semibold text-gray-900">
                {{ selectedClient.fullName }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ selectedClient.businessName || "Individual client" }}
              </p>
            </div>
            <UButton
              color="gray"
              variant="soft"
              icon="i-heroicons-pencil-square"
              class="w-full sm:w-auto"
              @click="openEditClient"
            >
              Edit client
            </UButton>
          </div>
          <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                WhatsApp
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.whatsappNumber || selectedClient.phone || 'Not provided' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.email || 'Not provided' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Preferred mobile money network
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.momoProvider.toUpperCase() }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </p>
              <p class="text-sm text-gray-900">
                {{ selectedClient.notes || '—' }}
              </p>
            </div>
          </div>
        </div>

        <div class="card rounded-3xl p-4 sm:p-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <p class="text-xs text-gray-500">Invoices sent</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ getClientStats(selectedClient.id)?.totalInvoices || 0 }}
              </p>
            </div>
            <div class="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <p class="text-xs text-gray-500">Paid</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
              </p>
            </div>
            <div class="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <p class="text-xs text-gray-500">Total value</p>
              <p class="mt-2 text-2xl font-semibold text-gray-900">
                {{ formatCurrency(getClientStats(selectedClient.id)?.totalValue || 0, 'GHS') }}
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

  <USlideover
    v-model:open="isClientDrawerOpen"
    :title="clientDrawerTitle"
    :description="clientDrawerDescription"
    :overlay="true"
  >
    <template #body>
      <UForm
        :id="clientFormId"
        :schema="clientSchema"
        :state="clientFormState"
        @submit="handleClientSubmit"
      >
        <div class="space-y-7">
          <section class="space-y-6 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div class="space-y-2">
              <h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Contact details
              </h3>
              <p class="text-sm text-slate-600">
                These fields populate invoice headers and reminder messages.
              </p>
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <UFormGroup
                label="Full name"
                name="fullName"
                required
                :ui="formGroupUi"
              >
                <UInput v-model="clientFormState.fullName" placeholder="Ama Mensah" />
              </UFormGroup>
              <UFormGroup label="Business name" name="businessName" :ui="formGroupUi">
                <UInput v-model="clientFormState.businessName" placeholder="Client business (optional)" />
              </UFormGroup>
              <UFormGroup label="Email" name="email" :ui="formGroupUi">
                <UInput v-model="clientFormState.email" type="email" placeholder="client@example.com" />
              </UFormGroup>
              <UFormGroup label="Phone" name="phone" :ui="formGroupUi">
                <UInput v-model="clientFormState.phone" placeholder="233200000000" />
              </UFormGroup>
              <UFormGroup label="WhatsApp number" name="whatsappNumber" :ui="formGroupUi">
                <UInput v-model="clientFormState.whatsappNumber" placeholder="233200000000" />
              </UFormGroup>
              <UFormGroup label="Preferred MoMo network" name="momoProvider" :ui="formGroupUi">
                <USelectMenu
                  v-model="clientFormState.momoProvider"
                  :items="momoProviderOptions"
                  value-key="value"
                  placeholder="Select provider"
                  search-input
                />
              </UFormGroup>
              <UFormGroup label="Notes" name="notes" class="sm:col-span-2" :ui="formGroupUi">
                <UTextarea
                  v-model="clientFormState.notes"
                  rows="4"
                  placeholder="Internal notes or client preferences"
                />
              </UFormGroup>
            </div>
          </section>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <UButton variant="ghost" color="gray" @click="close">
          Cancel
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-check"
          :loading="isSavingClient"
          type="submit"
          :form="clientFormId"
        >
          {{ clientSubmitLabel }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
