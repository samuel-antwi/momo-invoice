<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from "vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";

const toast = useToast();

const {
  profile,
  updateProfile,
  logout,
  refresh: refreshProfile,
} = useSession();
const { invoices } = useInvoices();
const { clients } = useClients();

const form = reactive({
  name: profile.value.name,
  email: profile.value.email,
  phone: profile.value.phone,
  whatsappNumber: profile.value.whatsappNumber,
  address: profile.value.address ?? "",
  themeColor: profile.value.themeColor,
});

const isSavingProfile = ref(false);

watch(
  () => profile.value,
  (newProfile) => {
    form.name = newProfile.name;
    form.email = newProfile.email;
    form.phone = newProfile.phone;
    form.whatsappNumber = newProfile.whatsappNumber;
    form.address = newProfile.address ?? "";
    form.themeColor = newProfile.themeColor;
  },
  { deep: true }
);

const saveProfile = async () => {
  if (isSavingProfile.value) return;

  isSavingProfile.value = true;
  try {
    await updateProfile({
      name: form.name,
      email: form.email,
      phone: form.phone,
      whatsappNumber: form.whatsappNumber,
      address: form.address,
      themeColor: form.themeColor,
    });

    toast.add({
      title: "Business profile updated",
      description: "Your workspace branding and contacts were saved.",
      color: "emerald",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Please try again in a few minutes.";
    toast.add({
      title: "Unable to save settings",
      description: message,
      color: "red",
    });
  } finally {
    isSavingProfile.value = false;
  }
};

const payoutForm = reactive({
  bankCode: profile.value.paystackSettlementBankCode ?? "",
  accountNumber: profile.value.paystackSettlementAccountNumber ?? "",
  accountName:
    profile.value.paystackSettlementAccountName ?? profile.value.name ?? "",
  currency: "GHS",
  type: "mobile_money",
});

const businessNameFieldId = useId();
const businessEmailFieldId = useId();
const businessPhoneFieldId = useId();
const businessWhatsappFieldId = useId();
const businessAddressFieldId = useId();
const themeColorFieldId = useId();
const settlementBankFieldId = useId();
const settlementAccountFieldId = useId();
const settlementNameFieldId = useId();
const payoutCurrencyFieldId = useId();
const payoutTypeFieldId = useId();

const payoutCurrencyOptions = [{ label: "Ghana • GHS", value: "GHS" }];

const payoutTypeOptions = [
  { label: "Mobile money", value: "mobile_money" },
  { label: "Bank account", value: "bank" },
];

watch(
  () => profile.value,
  (newProfile) => {
    payoutForm.bankCode =
      newProfile.paystackSettlementBankCode ?? payoutForm.bankCode;
    payoutForm.accountNumber =
      newProfile.paystackSettlementAccountNumber ?? payoutForm.accountNumber;
    payoutForm.accountName =
      newProfile.paystackSettlementAccountName ??
      newProfile.name ??
      payoutForm.accountName;
  },
  { deep: true }
);

watch(
  () => payoutForm.type,
  () => {
    payoutForm.bankCode = "";
    refreshBanks();
  }
);

const {
  data: banksData,
  pending: banksPending,
  refresh: refreshBanks,
  error: banksError,
} = useAsyncData(
  "paystack-banks",
  () => {
    const params: Record<string, string> = {
      country: "ghana",
      currency: payoutForm.currency,
    };
    if (payoutForm.type !== "bank") {
      params.type = payoutForm.type;
    }

    return $fetch<{
      banks: { name: string; code: string; type?: string }[];
      error?: string;
    }>("/api/paystack/banks", {
      method: "GET",
      params,
    });
  },
  {
    server: false,
    watch: [() => payoutForm.type, () => payoutForm.currency],
  }
);

const bankOptions = computed(() => {
  const options = (banksData.value?.banks ?? []).map((bank) => {
    const friendlyType = bank.type
      ? bank.type
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : undefined;

    const label = friendlyType ? `${friendlyType} • ${bank.name}` : bank.name;

    return {
      label,
      value: bank.code,
      raw: bank,
    };
  });

  if (
    payoutForm.bankCode &&
    !options.find((option) => option.value === payoutForm.bankCode)
  ) {
    options.unshift({ label: payoutForm.bankCode, value: payoutForm.bankCode });
  }

  return options;
});

const banksErrorMessage = computed(
  () => banksData.value?.error || banksError.value?.message
);

const selectedBank = computed(() =>
  (banksData.value?.banks ?? []).find(
    (bank) => bank.code === payoutForm.bankCode
  )
);

const paystackStatusVariant = computed(() => {
  switch (profile.value.paystackSubaccountStatus) {
    case "active":
      return { label: "Active", color: "success" as const };
    case "pending":
      return { label: "Pending sync", color: "warning" as const };
    case "error":
      return { label: "Needs attention", color: "error" as const };
    default:
      return { label: "Not configured", color: "neutral" as const };
  }
});

const isSubaccountActive = computed(
  () => profile.value.paystackSubaccountStatus === "active"
);
const isSubmittingSubaccount = ref(false);

const handleSubaccountSubmit = async () => {
  if (
    !payoutForm.bankCode ||
    !payoutForm.accountNumber ||
    !payoutForm.accountName
  ) {
    toast.add({
      title: "Missing payout details",
      description:
        "Please provide bank, account number, and account name to proceed.",
      color: "amber",
    });
    return;
  }

  isSubmittingSubaccount.value = true;
  try {
    await $fetch("/api/paystack/subaccount", {
      method: "POST",
      body: {
        bankCode: payoutForm.bankCode,
        bankType: selectedBank.value?.type,
        currency: payoutForm.currency,
        accountNumber: payoutForm.accountNumber,
        accountName: payoutForm.accountName,
      },
    });

    await refreshProfile();
    toast.add({
      title: "Paystack subaccount ready",
      description:
        "Future payments will settle directly to this payout account.",
      color: "emerald",
    });
  } catch (error) {
    const providerMessage = (error as { data?: { providerMessage?: string } })
      .data?.providerMessage;
    toast.add({
      title: "Unable to sync with Paystack",
      description:
        providerMessage ||
        (error as Error).message ||
        "Please try again in a few minutes.",
      color: "red",
    });
  } finally {
    isSubmittingSubaccount.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 pb-24"
  >
    <!-- Header Section -->
    <div
      class="bg-white/95 mb-8 rounded-xl backdrop-blur-md border border-slate-200/60 shadow-xl shadow-slate-900/10"
    >
      <div class="px-6 py-8">
        <div
          class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div class="space-y-3">
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
                    d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"
                  />
                </svg>
              </div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.35em] text-purple-600"
              >
                Settings
              </p>
            </div>
            <h1 class="text-3xl font-bold text-slate-900 mb-1">
              Tune MoMoInvoice to your brand
            </h1>
            <p class="text-sm text-slate-600 leading-relaxed">
              Manage business identity, contact channels, and payment
              preferences with ease.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-8">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
        <div class="space-y-6">
          <div
            class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10"
          >
            <div
              class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900">
                    Business Profile
                  </h3>
                  <p class="text-sm text-slate-600">
                    Essential business information and contact details
                  </p>
                </div>
              </div>
            </div>
            <div class="p-4 sm:p-6">
              <form
                class="space-y-6 sm:space-y-8"
                @submit.prevent="saveProfile"
              >
                <!-- Business Identity Section -->
                <div class="space-y-6">
                  <div
                    class="flex items-center gap-2 pb-2 border-b border-slate-200/60"
                  >
                    <svg
                      class="w-4 h-4 text-purple-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z"
                      />
                    </svg>
                    <h4 class="text-base font-semibold text-slate-800">
                      Business Identity
                    </h4>
                  </div>
                  <div class="grid gap-6 lg:grid-cols-2">
                    <UFormField
                      label="Business name"
                      name="businessName"
                      required
                    >
                      <UInput
                        :id="businessNameFieldId"
                        v-model="form.name"
                        size="xl"
                        required
                        placeholder="Your Business Name"
                        class="py-3.5 sm:py-3 text-base sm:text-sm"
                      />
                    </UFormField>
                    <UFormField label="Business Email" name="businessEmail">
                      <template #label>
                        <div class="flex items-center gap-2">
                          <span>Business Email</span>
                          <UBadge color="warning" variant="subtle" size="xs"
                            >Fallback</UBadge
                          >
                        </div>
                      </template>
                      <UInput
                        :id="businessEmailFieldId"
                        v-model="form.email"
                        type="email"
                        size="xl"
                        placeholder="business@example.com"
                        class="py-3.5 sm:py-3 text-base sm:text-sm"
                      />
                    </UFormField>
                  </div>
                </div>

                <!-- Contact Information Section -->
                <div class="space-y-6">
                  <div
                    class="flex items-center gap-2 pb-2 border-b border-slate-200/60"
                  >
                    <svg
                      class="w-4 h-4 text-purple-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"
                      />
                    </svg>
                    <h4 class="text-base font-semibold text-slate-800">
                      Contact Channels
                    </h4>
                  </div>
                  <div class="grid gap-6 lg:grid-cols-2">
                    <UFormField label="Primary Phone" name="businessPhone">
                      <template #label>
                        <div class="flex items-center gap-2">
                          <span>Primary Phone</span>
                          <UBadge color="primary" variant="subtle" size="xs"
                            >Invoices</UBadge
                          >
                        </div>
                      </template>
                      <UInput
                        :id="businessPhoneFieldId"
                        v-model="form.phone"
                        size="xl"
                        placeholder="+233 20 000 0000"
                        class="py-3.5 sm:py-3 text-base sm:text-sm"
                      />
                    </UFormField>
                    <UFormField label="WhatsApp Number" name="businessWhatsapp">
                      <template #label>
                        <div class="flex items-center gap-2">
                          <span>WhatsApp Number</span>
                          <UBadge color="success" variant="subtle" size="xs"
                            >Reminders</UBadge
                          >
                        </div>
                      </template>
                      <UInput
                        :id="businessWhatsappFieldId"
                        v-model="form.whatsappNumber"
                        size="xl"
                        placeholder="+233 20 000 0000"
                        class="py-3.5 sm:py-3 text-base sm:text-sm"
                      />
                    </UFormField>
                  </div>
                </div>

                <!-- Location Section -->
                <div class="space-y-6">
                  <div
                    class="flex items-center gap-2 pb-2 border-b border-slate-200/60"
                  >
                    <svg
                      class="w-4 h-4 text-purple-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z"
                      />
                    </svg>
                    <h4 class="text-base font-semibold text-slate-800">
                      Business Location
                    </h4>
                    <UBadge color="neutral" variant="subtle" size="xs"
                      >Optional</UBadge
                    >
                  </div>
                  <UFormField
                    label="Physical Address or Landmark"
                    name="businessAddress"
                  >
                    <template #label>
                      <div class="flex items-center gap-2">
                        <span>Physical Address or Landmark</span>
                        <UBadge color="neutral" variant="subtle" size="xs"
                          >Optional</UBadge
                        >
                      </div>
                    </template>
                    <UTextarea
                      :id="businessAddressFieldId"
                      v-model="form.address"
                      :rows="4"
                      placeholder="Near Accra Mall, East Legon&#10;GPS: GA-123-4567"
                      class="text-base sm:text-sm py-4 sm:py-3"
                    />
                  </UFormField>
                </div>

                <!-- Action Buttons -->
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 pt-6 border-t border-slate-200/60"
                >
                  <UButton
                    type="submit"
                    size="xl"
                    class="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 order-1 sm:order-2 py-3"
                    :loading="isSavingProfile"
                  >
                    <template #leading>
                      <svg
                        class="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"
                        />
                      </svg>
                    </template>
                    Save Profile
                  </UButton>
                </div>
              </form>
            </div>
          </div>

          <div
            class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10"
          >
            <div
              class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.22,15.05 2.27,14.78 2.46,14.63L4.57,12.97C4.53,12.65 4.5,12.33 4.5,12C4.5,11.67 4.53,11.34 4.57,11.03L2.46,9.37C2.27,9.22 2.22,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.78,8.95 21.73,9.22 21.54,9.37L19.43,11.03C19.47,11.34 19.5,11.67 19.5,12C19.5,12.33 19.47,12.65 19.43,12.97L21.54,14.63C21.73,14.78 21.78,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.03 19.05,18.95L16.56,17.94C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">
                      Paystack Settlement
                    </h3>
                    <p class="text-sm text-slate-600">
                      Configure automatic payment settlements
                    </p>
                  </div>
                </div>
                <UBadge
                  :color="paystackStatusVariant.color"
                  variant="soft"
                  class="font-semibold"
                >
                  {{ paystackStatusVariant.label }}
                </UBadge>
              </div>
            </div>
            <div class="p-6 space-y-6">
              <form class="space-y-5" @submit.prevent="handleSubaccountSubmit">
                <div class="grid gap-5 lg:grid-cols-2">
                  <UFormField
                    label="Currency"
                    name="payoutCurrency"
                    description="Paystack settles in Ghanaian Cedis for mobile money payouts."
                  >
                    <USelectMenu
                      :id="payoutCurrencyFieldId"
                      v-model="payoutForm.currency"
                      :items="payoutCurrencyOptions"
                      value-key="value"
                      disabled
                      size="xl"
                      class="text-base sm:text-sm"
                    />
                  </UFormField>
                  <UFormField
                    label="Payout type"
                    name="payoutType"
                    description="Choose mobile money or a traditional bank account."
                  >
                    <USelectMenu
                      :id="payoutTypeFieldId"
                      v-model="payoutForm.type"
                      :items="payoutTypeOptions"
                      value-key="value"
                      placeholder="Select payout channel"
                      size="xl"
                      class="text-base sm:text-sm"
                    />
                  </UFormField>
                  <UFormField
                    label="Settlement bank"
                    name="settlementBank"
                    :description="
                      banksPending
                        ? 'Loading banks…'
                        : 'Select where Paystack should settle funds.'
                    "
                    class="md:col-span-2"
                  >
                    <USelectMenu
                      :id="settlementBankFieldId"
                      v-model="payoutForm.bankCode"
                      :items="bankOptions"
                      value-key="value"
                      :loading="banksPending"
                      placeholder="Select bank or wallet"
                      searchable
                      searchable-placeholder="Search bank"
                      by="value"
                      size="xl"
                      class="text-base sm:text-sm"
                    >
                      <template #label>
                        <span v-if="payoutForm.bankCode">{{
                          bankOptions.find(
                            (option) => option.value === payoutForm.bankCode
                          )?.label || payoutForm.bankCode
                        }}</span>
                        <span v-else class="text-slate-400"
                          >Select bank or wallet</span
                        >
                      </template>
                    </USelectMenu>
                    <p v-if="banksErrorMessage" class="text-xs text-red-600">
                      {{ banksErrorMessage }}
                    </p>
                    <p
                      v-else-if="!banksPending && bankOptions.length === 0"
                      class="text-xs text-slate-500"
                    >
                      No payout channels available yet for this selection.
                    </p>
                  </UFormField>
                  <UFormField
                    label="Account number"
                    name="settlementAccount"
                    description="Mobile money or bank account that receives settlements."
                    required
                  >
                    <UInput
                      :id="settlementAccountFieldId"
                      v-model="payoutForm.accountNumber"
                      size="xl"
                      placeholder="233200000000"
                      required
                      class="py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </UFormField>
                  <UFormField
                    label="Account name"
                    name="settlementName"
                    description="Name that appears on Paystack settlements."
                    required
                    class="md:col-span-2"
                  >
                    <UInput
                      :id="settlementNameFieldId"
                      v-model="payoutForm.accountName"
                      size="xl"
                      placeholder="Success Nails"
                      required
                      class="py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </UFormField>
                </div>

                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p class="text-xs text-slate-500">
                    Paystack creates a dedicated subaccount so receipts and
                    settlements show your business details.
                  </p>
                  <UButton
                    type="submit"
                    size="lg"
                    class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg shadow-green-500/25 transition-all duration-300"
                    :loading="isSubmittingSubaccount"
                  >
                    <template #leading>
                      <svg
                        class="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4M20,18H4V8H20V18M4,6H20V6.5H4V6M7,10V16H9V10H7M11,10V16H17V14H13V12H16V10H11Z"
                        />
                      </svg>
                    </template>
                    {{
                      isSubaccountActive
                        ? "Update subaccount"
                        : "Create subaccount"
                    }}
                  </UButton>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div
            class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10"
          >
            <div
              class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25"
                >
                  <svg
                    class="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M17,12V3A1,1 0 0,0 16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900">
                    Reminder Channels
                  </h3>
                  <p class="text-sm text-slate-600">
                    Automated customer communication channels
                  </p>
                </div>
              </div>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div
                  class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-green-50/80 rounded-xl border border-green-200/50"
                >
                  <div
                    class="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50 mt-1.5 sm:mt-0 flex-shrink-0"
                  ></div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <svg
                        class="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.479 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.304 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"
                        />
                      </svg>
                      <span
                        class="text-base sm:text-lg font-semibold text-green-800"
                        >WhatsApp reminders</span
                      >
                    </div>
                    <p class="text-sm sm:text-base text-green-700">
                      Primary channel - Direct messaging for instant payment
                      reminders
                    </p>
                  </div>
                </div>
                <div
                  class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-blue-50/80 rounded-xl border border-blue-200/50"
                >
                  <div
                    class="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 shadow-lg shadow-blue-500/50 mt-1.5 sm:mt-0 flex-shrink-0"
                  ></div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <svg
                        class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H6L4,18V4H20V16Z"
                        />
                      </svg>
                      <span
                        class="text-base sm:text-lg font-semibold text-blue-800"
                        >SMS reminders</span
                      >
                    </div>
                    <p class="text-sm sm:text-base text-blue-700">
                      Fallback SMS delivery via Africa's Talking for broader
                      reach
                    </p>
                  </div>
                </div>
                <div
                  class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-amber-50/80 rounded-xl border border-amber-200/50"
                >
                  <div
                    class="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/50 mt-1.5 sm:mt-0 flex-shrink-0"
                  ></div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <svg
                        class="w-5 h-5 sm:w-6 sm:h-6 text-amber-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"
                        />
                      </svg>
                      <span
                        class="text-base sm:text-lg font-semibold text-amber-800"
                        >Email backup</span
                      >
                    </div>
                    <p class="text-sm sm:text-base text-amber-700">
                      Professional email reminders when other channels fail
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
