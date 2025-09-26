<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, useId } from "vue";
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui/dist/runtime/types";

import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { usePaymentMethods } from "~/composables/usePaymentMethods";
import { useSession } from "~/composables/useSession";
import { formatCurrency } from "~/utils/invoice-helpers";
import type {
  CreateClientPayload,
  CreateInvoicePayload,
  CreatePaymentMethodPayload,
  PaymentMethod,
} from "~/types/models";

const router = useRouter();
const toast = useToast();

const formId = "create-invoice-form";
const clientFieldId = useId();
const currencyFieldId = useId();
const issueDateFieldId = useId();
const dueDateFieldId = useId();
const paymentMethodFieldId = useId();
const payableToFieldId = useId();
const paymentInstructionsFieldId = useId();
const notesFieldId = useId();

const route = useRoute();
const { invoices, createInvoice, editInvoice, refresh } = useInvoices();
const { clients, createClient } = useClients();
const { paymentMethods: savedPaymentMethods, defaultMethod, createPaymentMethod } = usePaymentMethods();
const { profile } = useSession();
const isInitialising = ref(false);

const editInvoiceId = computed(() => {
  const paramId = (route.params as { id?: string }).id;
  if (typeof paramId === "string" && route.path.includes("/edit")) {
    return paramId;
  }
  const queryId = route.query.edit;
  const normalize = (value?: string) => {
    if (!value || value === "undefined" || value.trim() === "") return undefined;
    return value;
  };
  if (typeof queryId === "string") return normalize(queryId);
  if (Array.isArray(queryId)) return normalize(queryId[0]);
  return undefined;
});

const isEditMode = computed(() => Boolean(editInvoiceId.value));

const editingInvoice = computed(() =>
  editInvoiceId.value ? invoices.value.find((invoice) => invoice.id === editInvoiceId.value) : undefined,
);

const momoProviderOptions = [
  { label: "MTN Mobile Money (Paystack)", value: "mtn" },
  { label: "Vodafone Mobile Money (Paystack)", value: "vodafone" },
  { label: "AirtelTigo Mobile Money (Paystack)", value: "airteltigo" },
  { label: "Other", value: "other" },
];

const formGroupUi = {
  label: "text-sm font-medium text-slate-700",
  description: "text-xs text-slate-500",
  wrapper: "space-y-2"
};

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z
    .coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .positive("Quantity must be greater than zero"),
  unitPrice: z
    .coerce
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price cannot be negative"),
  taxRate: z
    .union([z.coerce.number().min(0).max(100), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    }),
  discount: z
    .union([z.coerce.number().min(0), z.literal(""), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return Number(value);
    }),
});

const schema = z.object({
  clientId: z.string().min(1, "Select a client"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional().nullable(),
  currency: z.string().min(3).max(3),
  paymentMethodId: z
    .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
      return undefined;
    }),
  notes: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return undefined;
    }),
  paymentInstructions: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return undefined;
    }),
  payableTo: z
    .string()
    .max(255)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === null) return null;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      }
      return undefined;
    }),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type FormInput = z.input<typeof schema>;
type FormSubmit = z.output<typeof schema>;

const optionalTrimmed = () =>
  z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
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
    (value) => !value || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
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

const paymentMethodSchema = z.object({
  label: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Label is required")),
  provider: z.enum(["mtn", "vodafone", "airteltigo", "other"]).optional(),
  accountName: optionalTrimmed().refine(
    (value) => !value || value.length <= 255,
    { message: "Payable name must be 255 characters or less" },
  ),
  accountNumber: optionalTrimmed().refine(
    (value) => !value || value.length <= 255,
    { message: "Account number must be 255 characters or less" },
  ),
  instructions: optionalTrimmed().refine(
    (value) => !value || value.length <= 2000,
    { message: "Instructions must be 2000 characters or less" },
  ),
  isDefault: z.boolean().optional(),
});

type PaymentMethodFormInput = z.input<typeof paymentMethodSchema>;
type PaymentMethodFormSubmit = z.output<typeof paymentMethodSchema>;

const state = reactive<FormInput>({
  clientId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  currency: profile.value.currency || "GHS",
  paymentMethodId: "",
  notes: "",
  paymentInstructions: "",
  payableTo: "",
  lineItems: [
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: undefined,
      discount: undefined,
    },
  ],
});

const formatDateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const populateStateFromInvoice = (invoice: InvoiceRecord) => {
  isInitialising.value = true;
  state.clientId = invoice.clientId;
  state.issueDate = formatDateInput(invoice.issueDate);
  state.dueDate = formatDateInput(invoice.dueDate ?? null);
  state.currency = (invoice.currency ?? profile.value.currency) || "GHS";
  state.paymentMethodId = invoice.paymentMethodId ?? "";
  state.notes = invoice.notes ?? "";
  state.paymentInstructions = invoice.paymentInstructions ?? "";
  state.payableTo = invoice.payableTo ?? "";
  state.lineItems = invoice.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    taxRate: item.taxRate !== undefined ? Number(item.taxRate) * 100 : undefined,
    discount: item.discount ?? undefined,
  }));
  if (state.lineItems.length === 0) {
    state.lineItems.push({
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: undefined,
      discount: undefined,
    });
  }
  nextTick(() => {
    isInitialising.value = false;
  });
};

const clientOptions = computed(() =>
  clients.value.map((client) => ({
    label: client.fullName,
    value: client.id,
    description: client.businessName || client.email || client.phone,
  })),
);

const paymentMethodOptions = computed(() =>
  savedPaymentMethods.value.map((method) => ({
    label: method.label,
    value: method.id,
    description: [method.accountName, method.accountNumber].filter(Boolean).join(" • ") || undefined,
  })),
);

const selectedClient = computed(() => clients.value.find((client) => client.id === state.clientId));
const selectedPaymentMethod = computed(() =>
  savedPaymentMethods.value.find((method) => method.id === state.paymentMethodId),
);

const hasInitialisedEdit = ref(false);

watch(
  editInvoiceId,
  async (id) => {
    if (!id) {
      hasInitialisedEdit.value = false;
      return;
    }
    hasInitialisedEdit.value = false;
    if (!editingInvoice.value) {
      await refresh();
    }
  },
  { immediate: true },
);

const headerTagline = computed(() => (isEditMode.value ? "Edit invoice" : "New invoice"));
const headerTitle = computed(() => (isEditMode.value ? "Update invoice" : "Create invoice"));
const primaryActionLabel = computed(() => (isEditMode.value ? "Update invoice" : "Save invoice"));
const cancelLink = computed(() =>
  isEditMode.value && editInvoiceId.value ? `/app/invoices/${editInvoiceId.value}` : "/app/invoices",
);
const isFormReady = computed(() => !isEditMode.value || hasInitialisedEdit.value);

watch(
  editingInvoice,
  (invoice) => {
    if (!isEditMode.value) return;
    if (invoice && !hasInitialisedEdit.value) {
      populateStateFromInvoice(invoice);
      hasInitialisedEdit.value = true;
    }
  },
  { immediate: true },
);

watch(
  () => profile.value.currency,
  (currency) => {
    if (isEditMode.value || isInitialising.value) return;
    state.currency = currency || "GHS";
  },
  { immediate: true },
);

const activeCurrency = computed(() => (state.currency || "GHS").toUpperCase());

const applyPaymentMethodDefaults = (method?: PaymentMethod | null) => {
  if (!method) return;
  if (method.accountName) {
    state.payableTo = method.accountName;
  }
  const hasInstructions = Boolean(state.paymentInstructions && state.paymentInstructions.toString().trim().length > 0);
  if (method.instructions) {
    state.paymentInstructions = method.instructions;
  } else if (!hasInstructions && method.accountNumber) {
    const providerLabel = (() => {
      switch (method.provider) {
        case "mtn":
          return "MTN Mobile Money via Paystack";
        case "vodafone":
          return "Vodafone Mobile Money via Paystack";
        case "airteltigo":
          return "AirtelTigo Mobile Money via Paystack";
        default:
          return "Paystack checkout";
      }
    })();
    const destination = method.accountNumber ? ` to account ${method.accountNumber}` : "";
    state.paymentInstructions = `Collect payment through ${providerLabel}${destination}.`;
  }
};

watch(
  defaultMethod,
  (method) => {
    if (!method || isInitialising.value) return;
    if (isEditMode.value && state.paymentMethodId && state.paymentMethodId !== "") return;
    if (!state.paymentMethodId || state.paymentMethodId === "") {
      state.paymentMethodId = method.id;
      applyPaymentMethodDefaults(method);
    }
  },
  { immediate: true },
);

watch(
  () => state.paymentMethodId,
  (id) => {
    if (!id || isInitialising.value) return;
    const method = savedPaymentMethods.value.find((item) => item.id === id);
    applyPaymentMethodDefaults(method);
  },
);

const totals = computed(() => {
  const subtotal = state.lineItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + quantity * price;
  }, 0);

  const taxTotal = state.lineItems.reduce((sum, item) => {
    if (item.taxRate === undefined || item.taxRate === "" || item.taxRate === null) return sum;
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const rate = Number(item.taxRate) / 100;
    return sum + quantity * price * rate;
  }, 0);

  const discountTotal = state.lineItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const total = subtotal + taxTotal - discountTotal;

  return { subtotal, taxTotal, discountTotal, total };
});

const isSubmitting = ref(false);
const isClientDrawerOpen = ref(false);
const isCreatingClient = ref(false);
const clientFormId = "create-client-form";
const isPaymentMethodDrawerOpen = ref(false);
const isCreatingPaymentMethod = ref(false);
const paymentMethodFormId = "create-payment-method-form";

const addLineItem = () => {
  state.lineItems.push({
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: undefined,
    discount: undefined,
  });
};

const lineItemFieldId = (index: number, field: string) => `invoice-line-${index}-${field}`;

const removeLineItem = (index: number) => {
  if (state.lineItems.length <= 1) return;
  state.lineItems.splice(index, 1);
};

const toIsoString = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const handleSubmit = async (event: FormSubmitEvent<FormSubmit>) => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const issueDate = toIsoString(event.data.issueDate);
    if (!issueDate) {
      throw new Error("Issue date is invalid");
    }

    const lineItemsPayload = event.data.lineItems.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: item.taxRate !== undefined ? Number(item.taxRate) / 100 : undefined,
      discount: item.discount !== undefined ? Number(item.discount) : undefined,
    }));

    const dueDateIso = toIsoString(event.data.dueDate ?? null);
    const notesValue = event.data.notes === undefined ? undefined : event.data.notes;
    const instructionsValue = event.data.paymentInstructions === undefined ? undefined : event.data.paymentInstructions;
    const payableToValue = event.data.payableTo === undefined ? undefined : event.data.payableTo;

    if (isEditMode.value) {
      const invoice = editingInvoice.value;
      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const editPayload = {
        clientId: event.data.clientId,
        issueDate,
        dueDate: dueDateIso,
        currency: activeCurrency.value,
        paymentMethodId: event.data.paymentMethodId ?? null,
        notes: notesValue,
        paymentInstructions: instructionsValue,
        payableTo: payableToValue,
        lineItems: lineItemsPayload,
      } as const;

      const updated = await editInvoice(invoice.id, editPayload);

      toast.add({
        title: "Invoice updated",
        description: `Invoice ${updated.invoiceNumber} has been saved.`,
        color: "green",
      });

      await router.push(`/app/invoices/${updated.id}`);
      return;
    }

    const payload: CreateInvoicePayload = {
      clientId: event.data.clientId,
      issueDate,
      dueDate: dueDateIso,
      status: "draft",
      currency: activeCurrency.value,
      paymentMethodId: event.data.paymentMethodId === null ? undefined : event.data.paymentMethodId,
      notes: notesValue,
      paymentInstructions: instructionsValue,
      payableTo: payableToValue,
      lineItems: lineItemsPayload,
    };

    const created = await createInvoice(payload);

    toast.add({
      title: "Invoice created",
      description: `Invoice ${created.invoiceNumber} is ready to share.`,
      color: "green",
    });

    await router.push(`/app/invoices/${created.id}`);
  } catch (error) {
    const validation = (error as { data?: { errors?: Record<string, string[]> } }).data?.errors;
    const serverMessage = validation ? Object.values(validation).flat()[0] : undefined;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to create invoice",
      description: serverMessage || fallback || "We couldn't save the invoice. Please try again.",
      color: "red",
    });
  } finally {
    isSubmitting.value = false;
  }
};

const clientFormState = reactive<ClientFormInput>({
  fullName: "",
  businessName: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  momoProvider: "mtn",
  notes: "",
});

const paymentMethodFormState = reactive<PaymentMethodFormInput>({
  label: "",
  provider: "mtn",
  accountName: "",
  accountNumber: "",
  instructions: "",
  isDefault: savedPaymentMethods.value.length === 0,
});

const resetClientForm = () => {
  clientFormState.fullName = "";
  clientFormState.businessName = "";
  clientFormState.email = "";
  clientFormState.phone = "";
  clientFormState.whatsappNumber = "";
  clientFormState.momoProvider = "mtn";
  clientFormState.notes = "";
};

const resetPaymentMethodForm = () => {
  paymentMethodFormState.label = "";
  paymentMethodFormState.provider = "mtn";
  paymentMethodFormState.accountName = "";
  paymentMethodFormState.accountNumber = "";
  paymentMethodFormState.instructions = "";
  paymentMethodFormState.isDefault = savedPaymentMethods.value.length === 0;
};

const openClientDrawer = () => {
  resetClientForm();
  isClientDrawerOpen.value = true;
};

const openPaymentMethodDrawer = () => {
  resetPaymentMethodForm();
  isPaymentMethodDrawerOpen.value = true;
};

watch(isClientDrawerOpen, (open) => {
  if (!open) {
    resetClientForm();
  }
});

watch(isPaymentMethodDrawerOpen, (open) => {
  if (!open) {
    resetPaymentMethodForm();
  }
});

const handleClientSubmit = async (event: FormSubmitEvent<ClientFormSubmit>) => {
  if (isCreatingClient.value) return;
  isCreatingClient.value = true;

  try {
    const payload: CreateClientPayload = {
      fullName: event.data.fullName,
      businessName: event.data.businessName,
      email: event.data.email,
      phone: event.data.phone,
      whatsappNumber: event.data.whatsappNumber,
      momoProvider: event.data.momoProvider,
      notes: event.data.notes,
    };

    const created = await createClient(payload);

    toast.add({
      title: "Client added",
      description: `${created.fullName} can now receive invoices.`,
      color: "green",
    });

    state.clientId = created.id;
    isClientDrawerOpen.value = false;
  } catch (error) {
    const validation = (error as { data?: { errors?: Record<string, string[]> } }).data?.errors;
    const serverMessage = validation ? Object.values(validation).flat()[0] : undefined;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to add client",
      description: serverMessage || fallback || "Something went wrong while saving the client.",
      color: "red",
    });
  } finally {
    isCreatingClient.value = false;
  }
};

const handlePaymentMethodSubmit = async (event: FormSubmitEvent<PaymentMethodFormSubmit>) => {
  if (isCreatingPaymentMethod.value) return;
  isCreatingPaymentMethod.value = true;

  try {
    const payload: CreatePaymentMethodPayload = {
      label: event.data.label,
      provider: event.data.provider,
      accountName: event.data.accountName,
      accountNumber: event.data.accountNumber,
      instructions: event.data.instructions,
      isDefault: event.data.isDefault ?? false,
    };

    const created = await createPaymentMethod(payload);

    toast.add({
      title: "Payment method saved",
      description: `${created.label} is ready to reuse on invoices.`,
      color: "green",
    });

    state.paymentMethodId = created.id;
    applyPaymentMethodDefaults(created);
    isPaymentMethodDrawerOpen.value = false;
  } catch (error) {
    const validation = (error as { data?: { errors?: Record<string, string[]> } }).data?.errors;
    const serverMessage = validation ? Object.values(validation).flat()[0] : undefined;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to save payment method",
      description: serverMessage || fallback || "We couldn't save the payment method. Please try again.",
      color: "red",
    });
  } finally {
    isCreatingPaymentMethod.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen pb-20">
    <!-- Mobile-First Header -->
    <header class="sticky top-0 z-20 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 backdrop-blur-xl border-b border-amber-100/50">
      <div class="px-4 py-3 sm:px-6 sm:py-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {{ headerTitle }}
            </h1>
            <p class="text-xs sm:text-sm text-gray-600 mt-0.5">Quick & easy invoice creation</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              color="gray"
              size="sm"
              :to="cancelLink"
              class="hidden sm:flex"
            >
              Cancel
            </UButton>
            <UButton
              color="amber"
              size="sm"
              icon="i-heroicons-check-circle"
              :loading="isSubmitting"
              :disabled="!isFormReady"
              type="submit"
              :form="formId"
              class="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg"
            >
              {{ primaryActionLabel }}
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile-optimized form -->
    <div class="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
      <UForm v-if="isFormReady" :id="formId" :schema="schema" :state="state" @submit="handleSubmit">
        <!-- Client Selection Section -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 class="font-semibold text-gray-900">Client Details</h2>
                </div>
                <UButton
                  variant="soft"
                  color="blue"
                  size="xs"
                  icon="i-heroicons-plus"
                  @click.prevent="openClientDrawer"
                >
                  Add New
                </UButton>
              </div>
            </div>
            <div class="p-4">
              <UFormGroup
                label="Select Client"
                name="clientId"
                required
                :ui="formGroupUi"
              >
                <USelectMenu
                  :id="clientFieldId"
                  v-model="state.clientId"
                  :items="clientOptions"
                  value-key="value"
                  placeholder="Choose a client..."
                  search-input
                  size="lg"
                  :ui="{
                    wrapper: 'relative',
                    base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border border-gray-200 rounded-xl',
                    placeholder: 'text-gray-500',
                  }"
                >
                  <template #option="{ option }">
                    <div>
                      <p class="font-medium">{{ option.label }}</p>
                      <p v-if="option.description" class="text-xs text-gray-500">{{ option.description }}</p>
                    </div>
                  </template>
                </USelectMenu>
              </UFormGroup>

              <!-- Selected Client Preview -->
              <div v-if="selectedClient" class="mt-3 p-3 bg-blue-50 rounded-xl">
                <p class="text-sm font-medium text-blue-900">{{ selectedClient.fullName }}</p>
                <p v-if="selectedClient.phone" class="text-xs text-blue-700 mt-0.5">📱 {{ selectedClient.phone }}</p>
                <p v-if="selectedClient.email" class="text-xs text-blue-700">✉️ {{ selectedClient.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Details Section -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-purple-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-purple-600" />
                </div>
                <h2 class="font-semibold text-gray-900">Invoice Information</h2>
              </div>
            </div>
            <div class="p-4 space-y-5">
              <div class="grid grid-cols-2 gap-4">
                <UFormGroup
                  label="Issue Date"
                  name="issueDate"
                  required
                  :ui="formGroupUi"
                >
                  <UInput
                    :id="issueDateFieldId"
                    v-model="state.issueDate"
                    type="date"
                    size="lg"
                    :ui="{
                      base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500',
                    }"
                  />
                </UFormGroup>
                <UFormGroup
                  label="Due Date"
                  name="dueDate"
                  :ui="formGroupUi"
                >
                  <UInput
                    :id="dueDateFieldId"
                    v-model="state.dueDate"
                    type="date"
                    size="lg"
                    :ui="{
                      base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500',
                    }"
                  />
                </UFormGroup>
              </div>

              <UFormGroup
                label="Currency"
                name="currency"
                :ui="formGroupUi"
              >
                <UInput
                  :id="currencyFieldId"
                  v-model="state.currency"
                  maxlength="3"
                  placeholder="GHS"
                  class="uppercase"
                  size="lg"
                  :ui="{
                    base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500',
                  }"
                />
              </UFormGroup>
            </div>
          </div>
        </div>

        <!-- Line Items Section -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-b border-emerald-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 class="font-semibold text-gray-900">Items</h2>
                </div>
                <UButton
                  variant="soft"
                  color="emerald"
                  size="xs"
                  icon="i-heroicons-plus"
                  @click.prevent="addLineItem"
                >
                  Add Item
                </UButton>
              </div>
            </div>
            <div class="p-4 space-y-4">
              <div
                v-for="(item, index) in state.lineItems"
                :key="index"
                class="relative bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200"
              >
                <!-- Item Header -->
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-semibold text-gray-700 bg-white px-2 py-1 rounded-lg">
                    Item {{ index + 1 }}
                  </span>
                  <UButton
                    v-if="state.lineItems.length > 1"
                    icon="i-heroicons-x-mark"
                    color="red"
                    variant="ghost"
                    size="xs"
                    @click.prevent="removeLineItem(index)"
                    class="hover:bg-red-50"
                  />
                </div>

                <!-- Item Fields -->
                <div class="space-y-4">
                  <UFormGroup
                    label="Description"
                    :name="`lineItems.${index}.description`"
                    required
                    :ui="formGroupUi"
                  >
                    <UInput
                      :id="lineItemFieldId(index, 'description')"
                      v-model="item.description"
                      placeholder="e.g., Website Design"
                      size="lg"
                    />
                  </UFormGroup>

                  <div class="grid grid-cols-2 gap-4">
                    <UFormGroup
                      label="Quantity"
                      :name="`lineItems.${index}.quantity`"
                      required
                      :ui="formGroupUi"
                    >
                      <UInput
                        :id="lineItemFieldId(index, 'quantity')"
                        v-model="item.quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        size="lg"
                      />
                    </UFormGroup>

                    <UFormGroup
                      label="Unit Price"
                      :name="`lineItems.${index}.unitPrice`"
                      required
                      :ui="formGroupUi"
                    >
                      <UInput
                        :id="lineItemFieldId(index, 'unitPrice')"
                        v-model="item.unitPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        size="lg"
                      />
                    </UFormGroup>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <UFormGroup
                      label="Tax (%)"
                      :name="`lineItems.${index}.taxRate`"
                      :ui="formGroupUi"
                    >
                      <UInput
                        :id="lineItemFieldId(index, 'taxRate')"
                        v-model="item.taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="0"
                        size="lg"
                      />
                    </UFormGroup>

                    <UFormGroup
                      :label="`Discount (${activeCurrency})`"
                      :name="`lineItems.${index}.discount`"
                      :ui="formGroupUi"
                    >
                      <UInput
                        :id="lineItemFieldId(index, 'discount')"
                        v-model="item.discount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        size="lg"
                      />
                    </UFormGroup>
                  </div>

                  <!-- Line Total Preview -->
                  <div class="mt-2 p-2 bg-emerald-50 rounded-lg text-center">
                    <p class="text-xs text-emerald-600">Line Total</p>
                    <p class="text-lg font-bold text-emerald-700">
                      {{ formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), activeCurrency) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment Details Section -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 border-b border-amber-100">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 class="font-semibold text-gray-900">Payment</h2>
                </div>
                <UButton
                  variant="soft"
                  color="amber"
                  size="xs"
                  icon="i-heroicons-plus"
                  @click.prevent="openPaymentMethodDrawer"
                >
                  New Method
                </UButton>
              </div>
            </div>
            <div class="p-4 space-y-5">
              <UFormGroup
                label="Payment Method"
                name="paymentMethodId"
                :ui="formGroupUi"
              >
                <USelectMenu
                  :id="paymentMethodFieldId"
                  v-model="state.paymentMethodId"
                  :items="paymentMethodOptions"
                  value-key="value"
                  placeholder="Select payment method"
                  search-input
                  size="lg"
                  :ui="{
                    wrapper: 'relative',
                    base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border border-gray-200 rounded-xl',
                  }"
                >
                  <template #option="{ option }">
                    <div>
                      <p class="font-medium">{{ option.label }}</p>
                      <p v-if="option.description" class="text-xs text-gray-500">{{ option.description }}</p>
                    </div>
                  </template>
                </USelectMenu>
              </UFormGroup>

              <UFormGroup
                label="Payable To"
                name="payableTo"
                :ui="formGroupUi"
              >
                <UInput
                  :id="payableToFieldId"
                  v-model="state.payableTo"
                  placeholder="Business or account name"
                  size="lg"
                  :ui="{
                    base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500',
                  }"
                />
              </UFormGroup>

              <UFormGroup
                label="Payment Instructions"
                name="paymentInstructions"
                :ui="formGroupUi"
              >
                <UTextarea
                  :id="paymentInstructionsFieldId"
                  v-model="state.paymentInstructions"
                  placeholder="How should the client pay?"
                  rows="3"
                  :ui="{
                    base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500',
                  }"
                />
              </UFormGroup>
            </div>
          </div>
        </div>

        <!-- Notes Section -->
        <div class="mb-6">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-gray-200">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5 text-gray-600" />
                </div>
                <h2 class="font-semibold text-gray-900">Additional Notes</h2>
              </div>
            </div>
            <div class="p-4">
              <UFormGroup
                label="Notes for Client"
                name="notes"
                :ui="formGroupUi"
              >
                <UTextarea
                  :id="notesFieldId"
                  v-model="state.notes"
                  placeholder="Any message for your client?"
                  rows="3"
                  :ui="{
                    base: 'border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500',
                  }"
                />
              </UFormGroup>
            </div>
          </div>
        </div>

        <!-- Invoice Summary - Sticky on Mobile -->
        <div class="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-t-2xl p-4 -mx-4 sm:relative sm:bottom-auto sm:shadow-none sm:border sm:rounded-2xl sm:mx-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900">Summary</h3>
            <span class="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {{ formatCurrency(totals.total, activeCurrency) }}
            </span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span class="font-medium">{{ formatCurrency(totals.subtotal, activeCurrency) }}</span>
            </div>
            <div v-if="totals.taxTotal > 0" class="flex justify-between text-gray-600">
              <span>Tax</span>
              <span class="font-medium">{{ formatCurrency(totals.taxTotal, activeCurrency) }}</span>
            </div>
            <div v-if="totals.discountTotal > 0" class="flex justify-between text-gray-600">
              <span>Discount</span>
              <span class="font-medium text-emerald-600">-{{ formatCurrency(totals.discountTotal, activeCurrency) }}</span>
            </div>
          </div>

          <!-- Mobile Action Buttons -->
          <div class="mt-4 grid grid-cols-2 gap-2 sm:hidden">
            <UButton
              variant="outline"
              color="gray"
              :to="cancelLink"
              block
            >
              Cancel
            </UButton>
            <UButton
              color="amber"
              icon="i-heroicons-check-circle"
              :loading="isSubmitting"
              :disabled="!isFormReady"
              type="submit"
              :form="formId"
              block
              class="bg-gradient-to-r from-amber-500 to-orange-600"
            >
              Save
            </UButton>
          </div>
        </div>
      </UForm>

      <div v-else class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="w-12 h-12 rounded-full bg-amber-100 animate-pulse mx-auto mb-3"></div>
          <p class="text-sm text-gray-500">Loading invoice details...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Client Drawer -->
  <USlideover
    v-model:open="isClientDrawerOpen"
    title="Add New Client"
    description="Quick client creation without leaving the invoice."
    :overlay="true"
  >
    <template #body>
      <UForm :id="clientFormId" :schema="clientSchema" :state="clientFormState" @submit="handleClientSubmit">
        <div class="space-y-4">
          <UFormGroup label="Full Name" name="fullName" required>
            <UInput
              v-model="clientFormState.fullName"
              placeholder="Ama Boateng"
              size="lg"
            />
          </UFormGroup>

          <UFormGroup label="Business Name" name="businessName">
            <UInput
              v-model="clientFormState.businessName"
              placeholder="Ama's Boutique"
              size="lg"
            />
          </UFormGroup>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Email" name="email">
              <UInput
                v-model="clientFormState.email"
                type="email"
                placeholder="ama@example.com"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Phone" name="phone">
              <UInput
                v-model="clientFormState.phone"
                placeholder="+233200000000"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="WhatsApp" name="whatsappNumber">
              <UInput
                v-model="clientFormState.whatsappNumber"
                placeholder="233200000000"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="MoMo Provider" name="momoProvider" required>
              <USelectMenu
                v-model="clientFormState.momoProvider"
                :items="momoProviderOptions"
                value-key="value"
                placeholder="Select provider"
                size="lg"
              />
            </UFormGroup>
          </div>

          <UFormGroup label="Notes" name="notes">
            <UTextarea
              v-model="clientFormState.notes"
              rows="3"
              placeholder="Internal notes"
            />
          </UFormGroup>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center justify-between gap-3">
        <UButton variant="ghost" color="gray" @click="close">
          Cancel
        </UButton>
        <UButton
          color="amber"
          icon="i-heroicons-user-plus"
          :loading="isCreatingClient"
          type="submit"
          :form="clientFormId"
          class="bg-gradient-to-r from-amber-500 to-orange-600"
        >
          Save Client
        </UButton>
      </div>
    </template>
  </USlideover>

  <!-- Payment Method Drawer -->
  <USlideover
    v-model:open="isPaymentMethodDrawerOpen"
    title="Add Payment Method"
    description="Save reusable payment details."
    :overlay="true"
  >
    <template #body>
      <UForm
        :id="paymentMethodFormId"
        :schema="paymentMethodSchema"
        :state="paymentMethodFormState"
        @submit="handlePaymentMethodSubmit"
      >
        <div class="space-y-6">
          <div class="space-y-4">
            <UFormGroup label="Label" name="label" required>
              <UInput
                v-model="paymentMethodFormState.label"
                placeholder="Primary Paystack"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Provider" name="provider">
              <USelectMenu
                v-model="paymentMethodFormState.provider"
                :items="momoProviderOptions"
                value-key="value"
                placeholder="Select provider"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Account Number" name="accountNumber">
              <UInput
                v-model="paymentMethodFormState.accountNumber"
                placeholder="233200000000"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Payable To" name="accountName">
              <UInput
                v-model="paymentMethodFormState.accountName"
                placeholder="Business name"
                size="lg"
              />
            </UFormGroup>

            <UFormGroup label="Instructions" name="instructions">
              <UTextarea
                v-model="paymentMethodFormState.instructions"
                rows="4"
                placeholder="Payment instructions"
              />
            </UFormGroup>

            <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
              <div>
                <p class="text-sm font-medium text-gray-900">Set as default</p>
                <p class="text-xs text-gray-500">Use for new invoices</p>
              </div>
              <USwitch
                v-model="paymentMethodFormState.isDefault"
                :ui="{
                  active: 'bg-amber-500',
                }"
              />
            </div>
          </div>
        </div>
      </UForm>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center justify-between gap-3">
        <UButton variant="ghost" color="gray" @click="close">
          Cancel
        </UButton>
        <UButton
          color="amber"
          icon="i-heroicons-credit-card"
          :loading="isCreatingPaymentMethod"
          type="submit"
          :form="paymentMethodFormId"
          class="bg-gradient-to-r from-amber-500 to-orange-600"
        >
          Save Method
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
/* Add smooth transitions and mobile optimizations */
@media (max-width: 640px) {
  input[type="date"]::-webkit-calendar-picker-indicator {
    padding: 8px;
    cursor: pointer;
  }
}
</style>