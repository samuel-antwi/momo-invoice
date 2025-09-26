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

const fieldLabelClass =
  "text-base font-semibold text-slate-700";
const fieldDescriptionClass = "text-sm text-slate-500";

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
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30 pb-24">
    <!-- Header Section -->
    <div class="bg-white/95 mb-8 rounded-xl backdrop-blur-md border border-slate-200/60 shadow-xl shadow-slate-900/10">
      <div class="px-6 py-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                </svg>
              </div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-purple-600">
                Settings
              </p>
            </div>
            <h1 class="text-3xl font-bold text-slate-900 mb-1">
              Tune MoMoInvoice to your brand
            </h1>
            <p class="text-sm text-slate-600 leading-relaxed">
              Manage business identity, contact channels, and payment preferences with ease.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-8">

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
      <div class="space-y-6">
        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Business Profile</h3>
                <p class="text-sm text-slate-600">Essential business information and contact details</p>
              </div>
            </div>
          </div>
          <div class="p-4 sm:p-6">
            <form class="space-y-6 sm:space-y-8" @submit.prevent="saveProfile">
            <!-- Business Identity Section -->
            <div class="space-y-6">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z" />
                </svg>
                <h4 class="text-base font-semibold text-slate-800">Business Identity</h4>
              </div>
              <div class="grid gap-6 lg:grid-cols-2">
                <div class="space-y-2.5">
                  <label :for="businessNameFieldId" class="flex items-center gap-2">
                    <span :class="fieldLabelClass">Business name</span>
                    <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5 pointer-events-none">
                      <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" opacity="0.3"/>
                        <path d="M12,7L12,12L16.5,14.5L17.5,13L13.5,11L13.5,7L12,7Z" />
                      </svg>
                    </div>
                    <UInput
                      :id="businessNameFieldId"
                      v-model="form.name"
                      size="xl"
                      required
                      placeholder="Your Business Name"
                      class="pl-12 sm:pl-11 py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </div>
                </div>
                <div class="space-y-2.5">
                  <label :for="businessEmailFieldId" class="flex items-center gap-2">
                    <span :class="fieldLabelClass">Business Email</span>
                    <UBadge color="warning" variant="subtle" size="xs">Fallback</UBadge>
                  </label>
                  <p :class="fieldDescriptionClass">
                    We'll notify you here if WhatsApp fails
                  </p>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5 pointer-events-none">
                      <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                      </svg>
                    </div>
                    <UInput
                      :id="businessEmailFieldId"
                      v-model="form.email"
                      type="email"
                      size="xl"
                      placeholder="business@example.com"
                      class="pl-12 sm:pl-11 py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Contact Information Section -->
            <div class="space-y-6">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                </svg>
                <h4 class="text-base font-semibold text-slate-800">Contact Channels</h4>
              </div>
              <div class="grid gap-6 lg:grid-cols-2">
                <div class="space-y-2.5">
                  <label :for="businessPhoneFieldId" class="flex items-center gap-2">
                    <span :class="fieldLabelClass">Primary Phone</span>
                    <UBadge color="primary" variant="subtle" size="xs">Invoices</UBadge>
                  </label>
                  <p :class="fieldDescriptionClass">
                    Displayed on all invoices
                  </p>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5 pointer-events-none">
                      <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                      </svg>
                    </div>
                    <UInput
                      :id="businessPhoneFieldId"
                      v-model="form.phone"
                      size="xl"
                      placeholder="+233 20 000 0000"
                      class="pl-12 sm:pl-11 py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </div>
                </div>
                <div class="space-y-2.5">
                  <label :for="businessWhatsappFieldId" class="flex items-center gap-2">
                    <span :class="fieldLabelClass">WhatsApp Number</span>
                    <UBadge color="success" variant="subtle" size="xs">Reminders</UBadge>
                  </label>
                  <p :class="fieldDescriptionClass">
                    For automated client reminders
                  </p>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5 pointer-events-none">
                      <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/>
                      </svg>
                    </div>
                    <UInput
                      :id="businessWhatsappFieldId"
                      v-model="form.whatsappNumber"
                      size="xl"
                      placeholder="+233 20 000 0000"
                      class="pl-12 sm:pl-11 py-3.5 sm:py-3 text-base sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Location Section -->
            <div class="space-y-6">
              <div class="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2C8.13,2 5,5.13 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9C19,5.13 15.87,2 12,2M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5Z" />
                </svg>
                <h4 class="text-base font-semibold text-slate-800">Business Location</h4>
                <UBadge color="neutral" variant="subtle" size="xs">Optional</UBadge>
              </div>
              <div class="space-y-2.5">
                <label :for="businessAddressFieldId" :class="fieldLabelClass">
                  Physical Address or Landmark
                </label>
                <p :class="fieldDescriptionClass">
                  Help clients locate your business easily
                </p>
                <div class="relative">
                  <div class="absolute top-3 left-3 sm:left-3.5 pointer-events-none">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                    </svg>
                  </div>
                  <UTextarea
                    :id="businessAddressFieldId"
                    v-model="form.address"
                    :rows="4"
                    placeholder="Near Accra Mall, East Legon&#10;GPS: GA-123-4567"
                    class="pl-12 sm:pl-11 text-base sm:text-sm py-4 sm:py-3"
                  />
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-slate-200/60">
              <div class="flex items-center gap-2 text-sm sm:text-base text-slate-600 order-2 sm:order-1 justify-center sm:justify-start">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,1L8,5H11V14H13V5H16M18,23H6C4.89,23 4,22.1 4,21V9A2,2 0 0,1 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z" />
                </svg>
                <span class="font-medium">Changes are saved instantly</span>
              </div>
              <UButton
                type="submit"
                size="xl"
                class="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 order-1 sm:order-2 py-3"
                :loading="isSavingProfile"
              >
                <template #leading>
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                  </svg>
                </template>
                Save Profile
              </UButton>
            </div>
          </form>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                  <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.22,15.05 2.27,14.78 2.46,14.63L4.57,12.97C4.53,12.65 4.5,12.33 4.5,12C4.5,11.67 4.53,11.34 4.57,11.03L2.46,9.37C2.27,9.22 2.22,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.78,8.95 21.73,9.22 21.54,9.37L19.43,11.03C19.47,11.34 19.5,11.67 19.5,12C19.5,12.33 19.47,12.65 19.43,12.97L21.54,14.63C21.73,14.78 21.78,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.03 19.05,18.95L16.56,17.94C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-900">Paystack Settlement</h3>
                  <p class="text-sm text-slate-600">Configure automatic payment settlements</p>
                </div>
              </div>
              <UBadge :color="paystackStatusVariant.color" variant="soft" class="font-semibold">
                {{ paystackStatusVariant.label }}
              </UBadge>
            </div>
          </div>
          <div class="p-6 space-y-6">

          <div
            v-if="profile.paystackSubaccountCode"
            class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-700"
          >
            <p class="font-semibold">Subaccount code</p>
            <p class="mt-1 font-mono text-sm">
              {{ profile.paystackSubaccountCode }}
            </p>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubaccountSubmit">
            <div class="grid gap-5 lg:grid-cols-2">
              <div class="space-y-2">
                <label :for="payoutCurrencyFieldId" :class="fieldLabelClass"
                  >Currency</label
                >
                <p :class="fieldDescriptionClass">
                  Paystack settles in Ghanaian Cedis for mobile money payouts.
                </p>
                <USelectMenu
                  :id="payoutCurrencyFieldId"
                  v-model="payoutForm.currency"
                  :items="payoutCurrencyOptions"
                  value-key="value"
                  disabled
                  size="xl"
                  class="text-base sm:text-sm"
                />
              </div>
              <div class="space-y-2">
                <label :for="payoutTypeFieldId" :class="fieldLabelClass"
                  >Payout type</label
                >
                <p :class="fieldDescriptionClass">
                  Choose mobile money or a traditional bank account.
                </p>
                <USelectMenu
                  :id="payoutTypeFieldId"
                  v-model="payoutForm.type"
                  :items="payoutTypeOptions"
                  value-key="value"
                  placeholder="Select payout channel"
                  size="xl"
                  class="text-base sm:text-sm"
                />
              </div>
              <div class="space-y-2 md:col-span-2">
                <label :for="settlementBankFieldId" :class="fieldLabelClass"
                  >Settlement bank</label
                >
                <p :class="fieldDescriptionClass">
                  {{
                    banksPending
                      ? "Loading banks…"
                      : "Select where Paystack should settle funds."
                  }}
                </p>
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
              </div>
              <div class="space-y-2">
                <label :for="settlementAccountFieldId" :class="fieldLabelClass"
                  >Account number</label
                >
                <p :class="fieldDescriptionClass">
                  Mobile money or bank account that receives settlements.
                </p>
                <UInput
                  :id="settlementAccountFieldId"
                  v-model="payoutForm.accountNumber"
                  size="xl"
                  placeholder="233200000000"
                  required
                  class="py-3.5 sm:py-3 text-base sm:text-sm"
                />
              </div>
              <div class="space-y-2 md:col-span-2">
                <label :for="settlementNameFieldId" :class="fieldLabelClass"
                  >Account name</label
                >
                <p :class="fieldDescriptionClass">
                  Name that appears on Paystack settlements.
                </p>
                <UInput
                  :id="settlementNameFieldId"
                  v-model="payoutForm.accountName"
                  size="xl"
                  placeholder="Success Nails"
                  required
                  class="py-3.5 sm:py-3 text-base sm:text-sm"
                />
              </div>
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
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4M20,18H4V8H20V18M4,6H20V6.5H4V6M7,10V16H9V10H7M11,10V16H17V14H13V12H16V10H11Z" />
                  </svg>
                </template>
                {{ isSubaccountActive ? "Update subaccount" : "Create subaccount" }}
              </UButton>
            </div>
          </form>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Workspace Health</h3>
                <p class="text-sm text-slate-600">Overview of your business metrics</p>
              </div>
            </div>
          </div>
          <div class="p-6">
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/80 p-5 text-center border border-blue-200/50 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300">
                <div class="flex items-center justify-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  <p class="text-xs font-bold uppercase tracking-wider text-blue-700">Invoices</p>
                </div>
                <p class="text-3xl font-bold text-blue-600 mb-2">
                  {{ invoices.length }}
                </p>
                <p class="text-xs text-blue-600/80 font-medium">
                  {{ invoices.filter((invoice) => invoice.status === "paid").length }} paid
                </p>
              </div>
              <div class="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100/80 p-5 text-center border border-green-200/50 shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-300">
                <div class="flex items-center justify-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                  </svg>
                  <p class="text-xs font-bold uppercase tracking-wider text-green-700">Clients</p>
                </div>
                <p class="text-3xl font-bold text-green-600 mb-2">
                  {{ clients.length }}
                </p>
                <p class="text-xs text-green-600/80 font-medium">Paystack-ready contacts</p>
              </div>
              <div class="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/80 p-5 text-center border border-purple-200/50 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-300">
                <div class="flex items-center justify-center gap-2 mb-3">
                  <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A2,2 0 0,1 14,4C14,5.5 13.18,6.77 12,7.46C10.82,6.77 10,5.5 10,4A2,2 0 0,1 12,2M21,9V7L19,8V10A7,7 0 0,1 12,17A7,7 0 0,1 5,10V8L3,7V9C3,10.25 3.32,11.44 3.86,12.5L2,14.5V17H22V14.5L20.14,12.5C20.68,11.44 21,10.25 21,9Z" />
                  </svg>
                  <p class="text-xs font-bold uppercase tracking-wider text-purple-700">Plan</p>
                </div>
                <p class="text-3xl font-bold text-purple-600 mb-2">
                  {{ profile.plan.toUpperCase() }}
                </p>
                <p class="text-xs text-purple-600/80 font-medium">Upgrade for automation</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-purple-50/80 to-blue-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17,12V3A1,1 0 0,0 16,2H3A1,1 0 0,0 2,3V17L6,13H16A1,1 0 0,0 17,12M21,6H19V15H6V17A1,1 0 0,0 7,18H18L22,22V7A1,1 0 0,0 21,6Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Reminder Channels</h3>
                <p class="text-sm text-slate-600">Automated customer communication channels</p>
              </div>
            </div>
          </div>
          <div class="p-6">
            <div class="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 mb-6">
              <p class="text-sm text-amber-800 font-medium">
                🚀 Simulated for now—going live with Supabase + Africa's Talking integration.
              </p>
            </div>
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-green-50/80 rounded-xl border border-green-200/50">
                <div class="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg shadow-green-500/50 mt-1.5 sm:mt-0 flex-shrink-0"></div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.479 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.304 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                    </svg>
                    <span class="text-base sm:text-lg font-semibold text-green-800">WhatsApp reminders</span>
                  </div>
                  <p class="text-sm sm:text-base text-green-700">Primary channel - Direct messaging for instant payment reminders</p>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-blue-50/80 rounded-xl border border-blue-200/50">
                <div class="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-sky-500 shadow-lg shadow-blue-500/50 mt-1.5 sm:mt-0 flex-shrink-0"></div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20,2H4A2,2 0 0,0 2,4V22L6,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H6L4,18V4H20V16Z" />
                    </svg>
                    <span class="text-base sm:text-lg font-semibold text-blue-800">SMS reminders</span>
                  </div>
                  <p class="text-sm sm:text-base text-blue-700">Fallback SMS delivery via Africa's Talking for broader reach</p>
                </div>
              </div>
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-amber-50/80 rounded-xl border border-amber-200/50">
                <div class="w-3 h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/50 mt-1.5 sm:mt-0 flex-shrink-0"></div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                    </svg>
                    <span class="text-base sm:text-lg font-semibold text-amber-800">Email backup</span>
                  </div>
                  <p class="text-sm sm:text-base text-amber-700">Professional email reminders when other channels fail</p>
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
