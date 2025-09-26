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
const sortBy = ref<"name" | "business" | "recent" | "value">("name");
const filterProvider = ref<string | null>(null);
const currentPage = ref(1);
const itemsPerPage = 8;
const isClientDetailsOpen = ref(false);

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
    { message: "Enter a valid email" }
  ),
  phone: optionalTrimmed().refine((value) => !value || value.length >= 3, {
    message: "Enter a valid phone number",
  }),
  whatsappNumber: optionalTrimmed().refine(
    (value) => !value || value.length >= 3,
    { message: "Enter a valid WhatsApp number" }
  ),
  momoProvider: z
    .enum(["mtn", "vodafone", "airteltigo", "other"])
    .default("mtn"),
  notes: optionalTrimmed().refine((value) => !value || value.length <= 1000, {
    message: "Notes must be 1000 characters or less",
  }),
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
  isEditMode.value ? "Edit client" : "Add client"
);
const clientDrawerDescription = computed(() =>
  isEditMode.value
    ? "Update the contact details your invoices and reminders rely on."
    : "Store a new client so you can invoice and send payment reminders quickly."
);
const clientSubmitLabel = computed(() =>
  isEditMode.value ? "Save changes" : "Add client"
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
  { deep: false }
);

const filteredAndSortedClients = computed(() => {
  let result = [...clients.value];

  // Filter by search term
  const query = searchTerm.value.trim().toLowerCase();
  if (query) {
    result = result.filter((client) =>
      [
        client.fullName,
        client.businessName ?? "",
        client.phone ?? "",
        client.email ?? "",
      ].some((field) => field.toLowerCase().includes(query))
    );
  }

  // Filter by provider
  if (filterProvider.value) {
    result = result.filter(
      (client) => client.momoProvider === filterProvider.value
    );
  }

  // Sort clients
  result.sort((a, b) => {
    const statsA = clientStats.value.find((s) => s.id === a.id);
    const statsB = clientStats.value.find((s) => s.id === b.id);

    switch (sortBy.value) {
      case "business":
        return (a.businessName ?? a.fullName).localeCompare(
          b.businessName ?? b.fullName
        );
      case "recent":
        // This would need invoice dates - for now, sort by creation if available
        return b.fullName.localeCompare(a.fullName); // Fallback
      case "value":
        return (statsB?.totalValue ?? 0) - (statsA?.totalValue ?? 0);
      case "name":
      default:
        return a.fullName.localeCompare(b.fullName);
    }
  });

  return result;
});

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredAndSortedClients.value.slice(start, end);
});

const totalPages = computed(() =>
  Math.ceil(filteredAndSortedClients.value.length / itemsPerPage)
);

const paginationInfo = computed(() => {
  const total = filteredAndSortedClients.value.length;
  const start = (currentPage.value - 1) * itemsPerPage + 1;
  const end = Math.min(start + itemsPerPage - 1, total);
  return { start, end, total };
});

// Reset to first page when filters change
watch([searchTerm, sortBy, filterProvider], () => {
  currentPage.value = 1;
});

const sortOptions = [
  { label: "Name A-Z", value: "name" },
  { label: "Business Name", value: "business" },
  { label: "Invoice Value", value: "value" },
  { label: "Recently Added", value: "recent" },
];

const providerOptions = [
  { label: "All Providers", value: null },
  { label: "MTN MoMo", value: "mtn" },
  { label: "Vodafone Cash", value: "vodafone" },
  { label: "AirtelTigo Money", value: "airteltigo" },
  { label: "Other", value: "other" },
];

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
  // Always open the details drawer for consistent UX
  isClientDetailsOpen.value = true;
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
      color: "warning",
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
        color: "success",
      });
      selectedClient.value = updated;
    } else {
      const created = await createClient(payload);
      toast.add({
        title: "Client added",
        description: `${created.fullName} is ready for invoicing.`,
        color: "success",
      });
      selectedClient.value = created;
    }

    isClientDrawerOpen.value = false;
  } catch (error) {
    const validation = (
      error as { data?: { errors?: Record<string, string[]> } }
    ).data?.errors;
    const serverMessage = validation
      ? Object.values(validation).flat()[0]
      : undefined;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to save client",
      description:
        serverMessage || fallback || "Please try again in a few minutes.",
      color: "error",
    });
  } finally {
    isSavingClient.value = false;
  }
};

const getProviderLabel = (provider: string) => {
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

const getProviderColor = (provider: string) => {
  switch (provider) {
    case "mtn":
      return "bg-gradient-to-br from-yellow-400 to-yellow-500";
    case "vodafone":
      return "bg-gradient-to-br from-red-500 to-red-600";
    case "airteltigo":
      return "bg-gradient-to-br from-blue-500 to-blue-600";
    default:
      return "bg-gradient-to-br from-slate-500 to-slate-600";
  }
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 pb-24">
    <!-- Header Section -->
    <div
      class="bg-white/95 rounded-lg backdrop-blur-md border-b border-slate-200"
    >
      <div class="px-4 py-6">
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.35em] text-purple-600"
              >
                Clients
              </p>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 mb-1">
              Build stronger relationships
            </h1>
            <p class="text-sm text-slate-600">
              Centralize contacts, track invoice value, and tailor reminders.
            </p>
          </div>
          <UButton
            color="primary"
            size="lg"
            class="w-full sm:w-auto bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-0 shadow-lg"
            @click="openCreateClient"
          >
            <template #leading>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8c0-.55-.45-1-1-1s-1 .45-1 1v2H2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </template>
            Add new client
          </UButton>
        </div>

        <!-- Search & Filters -->
        <div class="mt-6 space-y-4">
          <!-- Search Bar -->
          <div class="relative">
            <div
              class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
            >
              <svg
                class="w-5 h-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search clients by name, business, email or phone..."
              class="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-colors placeholder:text-slate-400 text-sm"
            />
          </div>

          <!-- Filters Row -->
          <div class="flex flex-col sm:flex-row gap-3">
            <!-- Sort Dropdown -->
            <div class="flex-1">
              <USelectMenu
                v-model="sortBy"
                :options="sortOptions"
                by="value"
                placeholder="Sort by"
                class="w-full"
                size="sm"
              >
                <template #leading>
                  <svg
                    class="w-4 h-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
                  </svg>
                </template>
              </USelectMenu>
            </div>

            <!-- Provider Filter -->
            <div class="flex-1">
              <USelectMenu
                v-model="filterProvider"
                :options="providerOptions"
                by="value"
                placeholder="Filter by provider"
                class="w-full"
                size="sm"
              >
                <template #leading>
                  <svg
                    class="w-4 h-4 text-slate-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                </template>
              </USelectMenu>
            </div>

            <!-- Reset Filters -->
            <UButton
              v-if="searchTerm || sortBy !== 'name' || filterProvider"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="
                searchTerm = '';
                sortBy = 'name';
                filterProvider = null;
              "
            >
              <template #leading>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </template>
              Clear filters
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="py-6">
      <!-- Single column layout for consistent UX -->
      <div>
        <!-- Client List -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center"
              >
                <svg
                  class="w-3 h-3 text-blue-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
                  />
                </svg>
              </div>
              <h2 class="font-semibold text-slate-900">All Clients</h2>
            </div>
            <div class="text-xs text-slate-500">
              {{ paginationInfo.total }} total
            </div>
          </div>

          <div
            v-if="filteredAndSortedClients.length === 0"
            class="text-center py-12"
          >
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <svg
                class="w-8 h-8 text-slate-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </div>
            <p class="text-sm text-slate-600 mb-2">No clients found</p>
            <p class="text-xs text-slate-500">
              {{
                searchTerm || filterProvider
                  ? "Try adjusting your filters"
                  : "Add your first client to get started"
              }}
            </p>
          </div>

          <div v-else class="space-y-2">
            <!-- Client List -->
            <div class="space-y-2">
              <div
                v-for="client in paginatedClients"
                :key="client.id"
                :class="[
                  'cursor-pointer rounded-2xl p-4 transition-all duration-200 group',
                  selectedClient?.id === client.id
                    ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-2 border-purple-200'
                    : 'bg-slate-50/50 hover:bg-gradient-to-br hover:from-purple-50/50 hover:to-blue-50/50 border-2 border-transparent hover:border-purple-100',
                ]"
                @click="selectClient(client)"
              >
                <div class="flex items-center justify-between">
                  <div class="min-w-0 flex-1">
                    <h3 class="font-semibold text-slate-900 mb-1 text-sm">
                      {{ client.fullName }}
                    </h3>
                    <p class="text-xs text-slate-500 mb-2">
                      {{ client.businessName || "Individual client" }}
                    </p>
                    <div class="flex items-center gap-2">
                      <div
                        :class="[
                          'px-2 py-1 rounded-lg text-xs font-medium text-white',
                          getProviderColor(client.momoProvider),
                        ]"
                      >
                        {{ getProviderLabel(client.momoProvider) }}
                      </div>
                    </div>
                  </div>
                  <div class="ml-3">
                    <div
                      :class="[
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        selectedClient?.id === client.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-200 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-600',
                      ]"
                    >
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="totalPages > 1"
              class="mt-6 pt-4 border-t border-slate-200"
            >
              <div class="flex items-center justify-between text-sm">
                <!-- Page Info -->
                <div class="text-slate-600">
                  Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of
                  {{ paginationInfo.total }}
                </div>

                <!-- Page Controls -->
                <div class="flex items-center gap-2">
                  <UButton
                    :disabled="currentPage === 1"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="currentPage--"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"
                      />
                    </svg>
                  </UButton>

                  <div class="flex items-center gap-1">
                    <template v-for="page in totalPages" :key="page">
                      <UButton
                        v-if="
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        "
                        :variant="currentPage === page ? 'solid' : 'ghost'"
                        :color="currentPage === page ? 'primary' : 'neutral'"
                        size="xs"
                        @click="currentPage = page"
                      >
                        {{ page }}
                      </UButton>
                      <span
                        v-else-if="
                          (page === 2 && currentPage > 4) ||
                          (page === totalPages - 1 &&
                            currentPage < totalPages - 3)
                        "
                        class="px-2 text-slate-400"
                      >
                        ...
                      </span>
                    </template>
                  </div>

                  <UButton
                    :disabled="currentPage === totalPages"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="currentPage++"
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                    </svg>
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Client Details - Removed for consistent drawer UX -->
        <div v-if="false" class="hidden space-y-6">
          <!-- Client Header -->
          <div
            class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden"
          >
            <div class="absolute inset-0 bg-black/10"></div>
            <div class="relative">
              <div
                class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
              >
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <div
                      class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
                    >
                      <svg
                        class="w-6 h-6 text-white"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 class="text-2xl font-bold">
                        {{ selectedClient.fullName }}
                      </h2>
                      <p class="text-white/80 text-sm">
                        {{ selectedClient.businessName || "Individual client" }}
                      </p>
                    </div>
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="solid"
                  class="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                  @click="openEditClient"
                >
                  <template #leading>
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                      />
                    </svg>
                  </template>
                  Edit client
                </UButton>
              </div>
            </div>
          </div>

          <!-- Contact Information -->
          <div
            class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
          >
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-emerald-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-900">Contact Information</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div class="space-y-1">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"
                    />
                  </svg>
                  WhatsApp
                </p>
                <p
                  class="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg"
                >
                  {{
                    selectedClient.whatsappNumber ||
                    selectedClient.phone ||
                    "Not provided"
                  }}
                </p>
              </div>

              <div class="space-y-1">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                    />
                  </svg>
                  Email
                </p>
                <p
                  class="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg"
                >
                  {{ selectedClient.email || "Not provided" }}
                </p>
              </div>

              <div class="space-y-1">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7Z"
                    />
                  </svg>
                  Mobile Money
                </p>
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'px-3 py-2 rounded-lg text-sm font-medium text-white flex-1',
                      getProviderColor(selectedClient.momoProvider),
                    ]"
                  >
                    {{ getProviderLabel(selectedClient.momoProvider) }}
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-2"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                    />
                  </svg>
                  Notes
                </p>
                <p
                  class="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded-lg min-h-[2.5rem] flex items-center"
                >
                  {{ selectedClient.notes || "No notes added" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Invoice Statistics -->
          <div
            class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
          >
            <div class="flex items-center gap-2 mb-6">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-amber-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7Z"
                  />
                </svg>
              </div>
              <h3 class="font-semibold text-slate-900">Invoice Performance</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-blue-900">
                      {{
                        getClientStats(selectedClient.id)?.totalInvoices || 0
                      }}
                    </p>
                    <p class="text-xs text-blue-700 font-medium">
                      Invoices sent
                    </p>
                  </div>
                </div>
              </div>

              <div
                class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-5 border border-emerald-200"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-emerald-900">
                      {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
                    </p>
                    <p class="text-xs text-emerald-700 font-medium">
                      Payments received
                    </p>
                  </div>
                </div>
              </div>

              <div
                class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M7 15h2v2H7zm0-4h2v2H7zm0-4h2v2H7zm6 8h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2zm6 8h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2z"
                      />
                      <path
                        d="M5 21h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2z"
                        fill="none"
                        stroke="currentColor"
                      />
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-bold text-amber-900">
                      {{
                        formatCurrency(
                          getClientStats(selectedClient.id)?.totalValue || 0,
                          "GHS"
                        )
                      }}
                    </p>
                    <p class="text-xs text-amber-700 font-medium">
                      Total value
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Empty State - Removed for consistent drawer UX -->
        <div
          v-if="false"
          class="hidden bg-white rounded-3xl shadow-sm border border-slate-200 min-h-[400px] items-center justify-center p-8 text-center"
        >
          <div>
            <div
              class="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center"
            >
              <svg
                class="w-10 h-10 text-slate-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 mb-2">
              Select a client
            </h3>
            <p class="text-sm text-slate-600 max-w-md">
              Choose a client from the list to view their contact details,
              mobile money preferences, and invoice performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Client Details Slideover -->
  <USlideover
    v-model:open="isClientDetailsOpen"
    :title="selectedClient?.fullName || 'Client Details'"
    :description="`View contact information and invoice performance for ${
      selectedClient?.fullName || 'this client'
    }.`"
    :overlay="true"
  >
    <template #body>
      <div v-if="selectedClient" class="space-y-6">
        <!-- Client Header -->
        <div
          class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white relative overflow-hidden"
        >
          <div class="absolute inset-0 bg-black/10"></div>
          <div class="relative">
            <div class="flex items-center gap-3 mb-3">
              <div
                class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
              >
                <svg
                  class="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold">{{ selectedClient.fullName }}</h2>
                <p class="text-white/80 text-sm">
                  {{ selectedClient.businessName || "Individual client" }}
                </p>
              </div>
            </div>
            <UButton
              color="neutral"
              variant="solid"
              size="sm"
              class="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
              @click="openEditClient"
            >
              <template #leading>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  />
                </svg>
              </template>
              Edit client
            </UButton>
          </div>
        </div>

        <!-- Contact Information -->
        <div class="space-y-4">
          <h3 class="font-semibold text-slate-900 flex items-center gap-2">
            <svg
              class="w-4 h-4 text-emerald-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
              />
            </svg>
            Contact Information
          </h3>

          <div class="space-y-3">
            <div class="bg-slate-50 rounded-xl p-3">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"
                  />
                </svg>
                WhatsApp
              </p>
              <p class="text-sm text-slate-900">
                {{
                  selectedClient.whatsappNumber ||
                  selectedClient.phone ||
                  "Not provided"
                }}
              </p>
            </div>

            <div class="bg-slate-50 rounded-xl p-3">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
                Email
              </p>
              <p class="text-sm text-slate-900">
                {{ selectedClient.email || "Not provided" }}
              </p>
            </div>

            <div class="bg-slate-50 rounded-xl p-3">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7Z"
                  />
                </svg>
                Mobile Money
              </p>
              <div
                :class="[
                  'px-3 py-2 rounded-lg text-sm font-medium text-white inline-block',
                  getProviderColor(selectedClient.momoProvider),
                ]"
              >
                {{ getProviderLabel(selectedClient.momoProvider) }}
              </div>
            </div>

            <div v-if="selectedClient.notes" class="bg-slate-50 rounded-xl p-3">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                  />
                </svg>
                Notes
              </p>
              <p class="text-sm text-slate-900">
                {{ selectedClient.notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Invoice Statistics -->
        <div class="space-y-4">
          <h3 class="font-semibold text-slate-900 flex items-center gap-2">
            <svg
              class="w-4 h-4 text-amber-600"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H20C21.1 4 22 4.9 22 6V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V6C2 4.9 2.9 4 4 4H7Z"
              />
            </svg>
            Invoice Performance
          </h3>

          <div class="space-y-3">
            <div
              class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center"
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
                <div>
                  <p class="text-xl font-bold text-blue-900">
                    {{ getClientStats(selectedClient.id)?.totalInvoices || 0 }}
                  </p>
                  <p class="text-xs text-blue-700 font-medium">Invoices sent</p>
                </div>
              </div>
            </div>

            <div
              class="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xl font-bold text-emerald-900">
                    {{ getClientStats(selectedClient.id)?.paidCount || 0 }}
                  </p>
                  <p class="text-xs text-emerald-700 font-medium">
                    Payments received
                  </p>
                </div>
              </div>
            </div>

            <div
              class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center"
                >
                  <svg
                    class="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M7 15h2v2H7zm0-4h2v2H7zm0-4h2v2H7zm6 8h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2zm6 8h2v2h-2zm0-4h2v2h-2zm0-4h2v2h-2z"
                    />
                    <path
                      d="M5 21h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2z"
                      fill="none"
                      stroke="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p class="text-xl font-bold text-amber-900">
                    {{
                      formatCurrency(
                        getClientStats(selectedClient.id)?.totalValue || 0,
                        "GHS"
                      )
                    }}
                  </p>
                  <p class="text-xs text-amber-700 font-medium">Total value</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Client Form Slideover -->
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
          <section
            class="space-y-6 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm"
          >
            <div class="space-y-2">
              <h3
                class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
              >
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
                <UInput
                  v-model="clientFormState.fullName"
                  placeholder="Ama Mensah"
                />
              </UFormGroup>
              <UFormGroup
                label="Business Name"
                name="businessName"
                :ui="formGroupUi"
              >
                <UInput
                  v-model="clientFormState.businessName"
                  placeholder="Client business (optional)"
                />
              </UFormGroup>
              <UFormGroup label="Email" name="email" :ui="formGroupUi">
                <UInput
                  v-model="clientFormState.email"
                  type="email"
                  placeholder="client@example.com"
                />
              </UFormGroup>
              <UFormGroup label="Phone" name="phone" :ui="formGroupUi">
                <UInput
                  v-model="clientFormState.phone"
                  placeholder="233200000000"
                />
              </UFormGroup>
              <UFormGroup
                label="WhatsApp number"
                name="whatsappNumber"
                :ui="formGroupUi"
              >
                <UInput
                  v-model="clientFormState.whatsappNumber"
                  placeholder="233200000000"
                />
              </UFormGroup>
              <UFormGroup
                label="Preferred MoMo network"
                name="momoProvider"
                :ui="formGroupUi"
              >
                <USelectMenu
                  v-model="clientFormState.momoProvider"
                  :items="momoProviderOptions"
                  value-key="value"
                  placeholder="Select provider"
                  search-input
                />
              </UFormGroup>
              <UFormGroup
                label="Notes"
                name="notes"
                class="sm:col-span-2"
                :ui="formGroupUi"
              >
                <UTextarea
                  v-model="clientFormState.notes"
                  :rows="4"
                  placeholder="Internal notes or client preferences"
                />
              </UFormGroup>
            </div>
          </section>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div
        class="flex items-center justify-between gap-3 border-t border-gray-100 pt-4"
      >
        <UButton variant="ghost" color="neutral" @click="close">
          Cancel
        </UButton>
        <UButton
          color="primary"
          :loading="isSavingClient"
          type="submit"
          :form="clientFormId"
        >
          <template #leading>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </template>
          {{ clientSubmitLabel }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
