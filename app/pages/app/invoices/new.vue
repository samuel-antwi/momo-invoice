<script setup lang="ts">
import { computed, reactive, ref, watch, useId } from "vue";
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui/dist/runtime/types";

import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import { formatCurrency } from "~/utils/invoice-helpers";
import type { CreateClientPayload, CreateInvoicePayload } from "~/types/models";

const router = useRouter();
const toast = useToast();

const formId = "create-invoice-form";
const clientFieldId = useId();
const currencyFieldId = useId();
const issueDateFieldId = useId();
const dueDateFieldId = useId();
const payableToFieldId = useId();
const paymentInstructionsFieldId = useId();
const notesFieldId = useId();

const { createInvoice } = useInvoices();
const { clients, createClient } = useClients();
const { profile } = useSession();

const momoProviderOptions = [
  { label: "MTN MoMo", value: "mtn" },
  { label: "Vodafone Cash", value: "vodafone" },
  { label: "AirtelTigo Money", value: "airteltigo" },
  { label: "Other", value: "other" },
];

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
  notes: z.string().max(2000).optional().nullable().transform((value) => value?.trim() || undefined),
  paymentInstructions: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => value?.trim() || undefined),
  payableTo: z.string().max(255).optional().nullable().transform((value) => value?.trim() || undefined),
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

const state = reactive<FormInput>({
  clientId: "",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  currency: profile.value.currency || "GHS",
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

const clientOptions = computed(() =>
  clients.value.map((client) => ({
    label: client.fullName,
    value: client.id,
    description: client.businessName || client.email || client.phone,
  })),
);

const selectedClient = computed(() => clients.value.find((client) => client.id === state.clientId));

watch(
  () => profile.value.currency,
  (currency) => {
    state.currency = currency || "GHS";
  },
  { immediate: true },
);

const activeCurrency = computed(() => (state.currency || "GHS").toUpperCase());

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

    const payload: CreateInvoicePayload = {
      clientId: event.data.clientId,
      issueDate,
      dueDate: toIsoString(event.data.dueDate ?? null),
      status: "draft",
      currency: activeCurrency.value,
      notes: event.data.notes ?? undefined,
      paymentInstructions: event.data.paymentInstructions ?? undefined,
      payableTo: event.data.payableTo ?? undefined,
      lineItems: event.data.lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: item.taxRate !== undefined ? Number(item.taxRate) / 100 : undefined,
        discount: item.discount !== undefined ? Number(item.discount) : undefined,
      })),
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

const resetClientForm = () => {
  clientFormState.fullName = "";
  clientFormState.businessName = "";
  clientFormState.email = "";
  clientFormState.phone = "";
  clientFormState.whatsappNumber = "";
  clientFormState.momoProvider = "mtn";
  clientFormState.notes = "";
};

const openClientDrawer = () => {
  resetClientForm();
  isClientDrawerOpen.value = true;
};

watch(isClientDrawerOpen, (open) => {
  if (!open) {
    resetClientForm();
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
</script>

<template>
  <div class="flex flex-col gap-6 sm:px-0">
    <section class="card rounded-3xl p-4 sm:p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-2">
          <p class="text-sm font-bold uppercase tracking-wider text-blue-600">New invoice</p>
          <h1 class="text-3xl font-bold text-gray-900">Create invoice</h1>
          <p class="text-sm text-gray-600">Capture the essentials, send the link, and get paid via MoMo faster.</p>
        </div>
        <div class="flex gap-3">
          <UButton variant="outline" color="gray" :to="'/app/invoices'">
            Cancel
          </UButton>
          <UButton
            color="primary"
            icon="i-heroicons-check"
            :loading="isSubmitting"
            type="submit"
            :form="formId"
          >
            Save invoice
          </UButton>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
      <UCard class="rounded-3xl p-4 sm:p-6">
        <UForm :id="formId" :schema="schema" :state="state" @submit="handleSubmit">
          <div class="space-y-8">
            <div class="grid gap-6 sm:grid-cols-2">
              <div class="sm:col-span-2 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <label :for="clientFieldId" class="text-sm font-medium text-gray-700">Client</label>
                  <UButton
                    variant="soft"
                    color="primary"
                    size="sm"
                    icon="i-heroicons-user-plus"
                    @click.prevent="openClientDrawer"
                  >
                    New client
                  </UButton>
                </div>
                <UFormGroup label="Client" name="clientId" required :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <USelectMenu
                    :id="clientFieldId"
                    v-model="state.clientId"
                    :items="clientOptions"
                    value-key="value"
                    placeholder="Select client"
                    search-input
                  />
                </UFormGroup>
              </div>
              <div class="flex flex-col gap-2">
                <label :for="currencyFieldId" class="text-sm font-medium text-gray-700">Currency</label>
                <UFormGroup label="Currency" name="currency" :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <UInput
                    :id="currencyFieldId"
                    v-model="state.currency"
                    maxlength="3"
                    placeholder="GHS"
                    class="uppercase"
                  />
                </UFormGroup>
              </div>
              <div class="flex flex-col gap-2">
                <label :for="issueDateFieldId" class="text-sm font-medium text-gray-700">Issue date</label>
                <UFormGroup label="Issue date" name="issueDate" required :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <UInput
                    :id="issueDateFieldId"
                    v-model="state.issueDate"
                    type="date"
                  />
                </UFormGroup>
              </div>
              <div class="flex flex-col gap-2">
                <label :for="dueDateFieldId" class="text-sm font-medium text-gray-700">Due date</label>
                <UFormGroup label="Due date" name="dueDate" :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <UInput
                    :id="dueDateFieldId"
                    v-model="state.dueDate"
                    type="date"
                  />
                </UFormGroup>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Line items</h2>
                <UButton icon="i-heroicons-plus" variant="soft" color="primary" size="sm" @click.prevent="addLineItem">
                  Add item
                </UButton>
              </div>
              <div class="space-y-6">
                <div
                  v-for="(item, index) in state.lineItems"
                  :key="index"
                  class="rounded-2xl border border-gray-100 p-4 sm:p-5"
                >
                  <div class="flex items-start justify-between gap-3">
                    <h3 class="text-base font-semibold text-gray-900">Item {{ index + 1 }}</h3>
                    <UButton
                      v-if="state.lineItems.length > 1"
                      icon="i-heroicons-trash"
                      color="red"
                      variant="ghost"
                      size="sm"
                      @click.prevent="removeLineItem(index)"
                    >
                      Remove
                    </UButton>
                  </div>
                  <div class="mt-4 grid gap-4 sm:grid-cols-2">
                    <div class="sm:col-span-2 flex flex-col gap-2">
                      <label :for="lineItemFieldId(index, 'description')" class="text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <UFormGroup
                        :label="'Description'"
                        :name="`lineItems.${index}.description`"
                        required
                        :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                      >
                        <UInput
                          :id="lineItemFieldId(index, 'description')"
                          v-model="item.description"
                          placeholder="e.g., Bridal package"
                        />
                      </UFormGroup>
                    </div>
                    <div class="flex flex-col gap-2">
                      <label :for="lineItemFieldId(index, 'quantity')" class="text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      <UFormGroup
                        :label="'Quantity'"
                        :name="`lineItems.${index}.quantity`"
                        required
                        :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                      >
                        <UInput
                          :id="lineItemFieldId(index, 'quantity')"
                          v-model="item.quantity"
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </UFormGroup>
                    </div>
                    <div class="flex flex-col gap-2">
                      <label :for="lineItemFieldId(index, 'unitPrice')" class="text-sm font-medium text-gray-700">
                        Unit price
                      </label>
                      <UFormGroup
                        :label="'Unit price'"
                        :name="`lineItems.${index}.unitPrice`"
                        required
                        :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                      >
                        <UInput
                          :id="lineItemFieldId(index, 'unitPrice')"
                          v-model="item.unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                        />
                      </UFormGroup>
                    </div>
                    <div class="flex flex-col gap-2">
                      <label :for="lineItemFieldId(index, 'taxRate')" class="text-sm font-medium text-gray-700">
                        Tax (%)
                      </label>
                      <UFormGroup
                        :label="'Tax (%)'"
                        :name="`lineItems.${index}.taxRate`"
                        :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                      >
                        <UInput
                          :id="lineItemFieldId(index, 'taxRate')"
                          v-model="item.taxRate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                        />
                      </UFormGroup>
                    </div>
                    <div class="flex flex-col gap-2">
                      <label :for="lineItemFieldId(index, 'discount')" class="text-sm font-medium text-gray-700">
                        Discount ({{ activeCurrency }})
                      </label>
                      <UFormGroup
                        :label="`Discount (${activeCurrency})`"
                        :name="`lineItems.${index}.discount`"
                        :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                      >
                        <UInput
                          :id="lineItemFieldId(index, 'discount')"
                          v-model="item.discount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                        />
                      </UFormGroup>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label :for="payableToFieldId" class="text-sm font-medium text-gray-700">Payable to</label>
                <UFormGroup label="Payable to" name="payableTo" :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <UInput :id="payableToFieldId" v-model="state.payableTo" placeholder="Business or MoMo account name" />
                </UFormGroup>
              </div>
              <div class="sm:col-span-2 flex flex-col gap-2">
                <label :for="paymentInstructionsFieldId" class="text-sm font-medium text-gray-700">Payment instructions</label>
                <UFormGroup
                  label="Payment instructions"
                  name="paymentInstructions"
                  :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }"
                >
                  <UTextarea
                    :id="paymentInstructionsFieldId"
                    v-model="state.paymentInstructions"
                    placeholder="Include MoMo steps, reference numbers, or bank details"
                    rows="3"
                  />
                </UFormGroup>
              </div>
              <div class="sm:col-span-2 flex flex-col gap-2">
                <label :for="notesFieldId" class="text-sm font-medium text-gray-700">Internal notes</label>
                <UFormGroup label="Internal notes" name="notes" :ui="{ label: 'sr-only', wrapper: 'flex flex-col gap-2' }">
                  <UTextarea
                    :id="notesFieldId"
                    v-model="state.notes"
                    placeholder="Optional notes for the client"
                    rows="3"
                  />
                </UFormGroup>
              </div>
            </div>
          </div>
        </UForm>
      </UCard>

      <UCard class="rounded-3xl p-4 sm:p-6">
        <div class="space-y-6">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Invoice summary</h2>
            <p class="text-sm text-gray-600">Totals update automatically as you add line items.</p>
          </div>
          <div class="space-y-3 rounded-2xl bg-gray-50 p-4">
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(totals.subtotal, activeCurrency) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(totals.taxTotal, activeCurrency) }}</span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>Discounts</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(totals.discountTotal, activeCurrency) }}</span>
            </div>
            <div class="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
              <span>Total due</span>
              <span>{{ formatCurrency(totals.total, activeCurrency) }}</span>
            </div>
          </div>

          <div v-if="selectedClient" class="space-y-2 rounded-2xl border border-gray-100 p-4">
            <h3 class="text-sm font-semibold text-gray-900">Client</h3>
            <p class="text-sm text-gray-700">{{ selectedClient.fullName }}</p>
            <p v-if="selectedClient.businessName" class="text-sm text-gray-500">{{ selectedClient.businessName }}</p>
            <p v-if="selectedClient.phone" class="text-sm text-gray-500">{{ selectedClient.phone }}</p>
            <p v-if="selectedClient.email" class="text-sm text-gray-500">{{ selectedClient.email }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>

  <USlideover
    v-model:open="isClientDrawerOpen"
    title="Add client"
    description="Save a new client without leaving this invoice."
    :overlay="true"
  >
    <template #body>
      <UForm :id="clientFormId" :schema="clientSchema" :state="clientFormState" @submit="handleClientSubmit">
        <div class="space-y-4">
          <UFormGroup label="Full name" name="fullName" required>
            <UInput v-model="clientFormState.fullName" placeholder="Ama Boateng" />
          </UFormGroup>
          <UFormGroup label="Business name" name="businessName">
            <UInput v-model="clientFormState.businessName" placeholder="Ama's Boutique" />
          </UFormGroup>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormGroup label="Email" name="email">
              <UInput v-model="clientFormState.email" type="email" placeholder="ama@example.com" />
            </UFormGroup>
            <UFormGroup label="Phone" name="phone">
              <UInput v-model="clientFormState.phone" placeholder="+233200000000" />
            </UFormGroup>
            <UFormGroup label="WhatsApp number" name="whatsappNumber">
              <UInput v-model="clientFormState.whatsappNumber" placeholder="233200000000" />
            </UFormGroup>
            <UFormGroup label="MoMo provider" name="momoProvider" required>
              <USelectMenu
                v-model="clientFormState.momoProvider"
                :items="momoProviderOptions"
                value-key="value"
                placeholder="Select provider"
              />
            </UFormGroup>
          </div>
          <UFormGroup label="Notes" name="notes">
            <UTextarea v-model="clientFormState.notes" rows="3" placeholder="Internal notes or preferences" />
          </UFormGroup>
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
          icon="i-heroicons-user-plus"
          :loading="isCreatingClient"
          type="submit"
          :form="clientFormId"
        >
          Save client
        </UButton>
      </div>
    </template>
</USlideover>
</template>
