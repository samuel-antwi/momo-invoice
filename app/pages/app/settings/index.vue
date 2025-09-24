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
  "text-xs font-semibold uppercase tracking-wide text-slate-500";
const fieldDescriptionClass = "text-xs text-slate-500";

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
      return { label: "Needs attention", color: "danger" as const };
    default:
      return { label: "Not configured", color: "gray" as const };
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
  <div class="flex flex-col gap-8">
    <section class="glass-panel rounded-3xl p-6">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400"
          >
            Workspace settings
          </p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">
            Tune MoMoInvoice to your brand
          </h2>
          <p class="text-sm text-slate-500">
            Manage business identity, contact channels, and notification
            preferences.
          </p>
        </div>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
      <div class="space-y-6">
        <UCard
          :ui="{ body: 'space-y-5 p-6' }"
          class="glass-panel rounded-3xl border-none bg-white/90"
        >
          <form class="space-y-5" @submit.prevent="saveProfile">
            <div class="grid gap-5 md:grid-cols-2">
              <div class="space-y-2">
                <label :for="businessNameFieldId" :class="fieldLabelClass"
                  >Business name</label
                >
                <UInput
                  :id="businessNameFieldId"
                  v-model="form.name"
                  size="lg"
                  required
                />
              </div>
              <div class="space-y-2">
                <label :for="businessEmailFieldId" :class="fieldLabelClass"
                  >Email (fallback)</label
                >
                <p :class="fieldDescriptionClass">
                  We'll notify you here if WhatsApp fails.
                </p>
                <UInput
                  :id="businessEmailFieldId"
                  v-model="form.email"
                  type="email"
                  size="lg"
                />
              </div>
              <div class="space-y-2">
                <label :for="businessPhoneFieldId" :class="fieldLabelClass"
                  >Primary phone</label
                >
                <p :class="fieldDescriptionClass">
                  Displayed on invoices and client reminders.
                </p>
                <UInput
                  :id="businessPhoneFieldId"
                  v-model="form.phone"
                  size="lg"
                />
              </div>
              <div class="space-y-2">
                <label :for="businessWhatsappFieldId" :class="fieldLabelClass"
                  >WhatsApp number</label
                >
                <p :class="fieldDescriptionClass">
                  Used for automated reminders.
                </p>
                <UInput
                  :id="businessWhatsappFieldId"
                  v-model="form.whatsappNumber"
                  size="lg"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label :for="businessAddressFieldId" :class="fieldLabelClass"
                >Business address / location</label
              >
              <p :class="fieldDescriptionClass">
                Optional—helps clients know where you operate.
              </p>
              <UTextarea
                :id="businessAddressFieldId"
                v-model="form.address"
                rows="3"
              />
            </div>

            <div
              class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <UButton
                type="submit"
                color="primary"
                size="lg"
                icon="i-heroicons-check"
                :loading="isSavingProfile"
              >
                Save changes
              </UButton>
            </div>
          </form>
        </UCard>

        <UCard
          :ui="{ body: 'space-y-6 p-6' }"
          class="glass-panel rounded-3xl border-none bg-white/90"
        >
          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 class="text-base font-semibold text-slate-900">
                Paystack settlement account
              </h3>
              <p class="text-sm text-slate-500">
                Configure where Paystack should settle payments for your
                business.
              </p>
            </div>
            <UBadge :color="paystackStatusVariant.color" variant="soft">{{
              paystackStatusVariant.label
            }}</UBadge>
          </div>

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
            <div class="grid gap-5 md:grid-cols-2">
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
                  size="lg"
                  placeholder="233200000000"
                  required
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
                  size="lg"
                  placeholder="Success Nails"
                  required
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
                color="primary"
                size="lg"
                :loading="isSubmittingSubaccount"
                icon="i-heroicons-credit-card"
                >{{
                  isSubaccountActive ? "Update subaccount" : "Create subaccount"
                }}</UButton
              >
            </div>
          </form>
        </UCard>
      </div>

      <div class="space-y-6">
        <div class="glass-panel rounded-3xl p-6">
          <h3
            class="text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Workspace health
          </h3>
          <div class="mt-5 grid gap-4 sm:grid-cols-3">
            <div
              class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center"
            >
              <p class="text-xs text-slate-500">Invoices</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ invoices.length }}
              </p>
              <p class="text-xs text-slate-500">
                {{
                  invoices.filter((invoice) => invoice.status === "paid").length
                }}
                paid
              </p>
            </div>
            <div
              class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center"
            >
              <p class="text-xs text-slate-500">Clients</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ clients.length }}
              </p>
              <p class="text-xs text-slate-500">Paystack-ready contacts</p>
            </div>
            <div
              class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center"
            >
              <p class="text-xs text-slate-500">Plan</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ profile.plan.toUpperCase() }}
              </p>
              <p class="text-xs text-slate-500">Upgrade for automation</p>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <h3
            class="text-sm font-semibold uppercase tracking-wide text-slate-500"
          >
            Reminder channels
          </h3>
          <p class="mt-2 text-sm text-slate-500">
            Simulated for now—going live with Supabase + Africa’s Talking
            integration.
          </p>
          <ul class="mt-4 space-y-3 text-sm text-slate-600">
            <li class="flex items-center gap-2">
              <span
                class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
              />
              WhatsApp reminders (primary)
            </li>
            <li class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
              SMS reminders via Africa's Talking
            </li>
            <li class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              Email backup for edge cases
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
