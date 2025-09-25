<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import type { InvoiceStatus } from "~/types/models";
import {
  calculateInvoiceTotals,
  formatCurrency,
  formatDate,
} from "~/utils/invoice-helpers";
import parsePhoneNumberFromString, {
  type CountryCode,
} from "libphonenumber-js/min";

const route = useRoute();
const router = useRouter();
const invoiceId = computed(() => route.params.id as string);

const { invoices, markPaid, setStatus, markShared } = useInvoices();
const { clients } = useClients();
const { profile } = useSession();
const toast = useToast();
const runtimeConfig = useRuntimeConfig();

const appUrl = ref<string | undefined>(
  runtimeConfig.public.appUrl?.replace(/\/$/, "")
);

if (!appUrl.value && import.meta.client) {
  appUrl.value = window.location.origin;
}

const currencyDialCodeMap: Record<string, string> = {
  GHS: "233",
  NGN: "234",
  KES: "254",
  GBP: "44",
  USD: "1",
  EUR: "44", // default to UK for now
};

const currencyCountryMap: Record<string, CountryCode> = {
  GHS: "GH",
  NGN: "NG",
  KES: "KE",
  GBP: "GB",
  USD: "US",
  EUR: "GB",
};

const fallbackCountryCodesBase: CountryCode[] = ["GB", "GH", "NG", "KE", "US"];

const invoice = computed(() =>
  invoices.value.find((item) => item.id === invoiceId.value)
);
const client = computed(() =>
  clients.value.find((item) => item.id === invoice.value?.clientId)
);
const totals = computed(() =>
  invoice.value ? calculateInvoiceTotals(invoice.value) : null
);

const invoiceCurrency = computed(
  () => invoice.value?.currency ?? profile.value.currency
);

const invoicePublicUrl = computed(() => {
  if (!invoice.value || !appUrl.value) return undefined;
  return `${appUrl.value}/invoices/${invoice.value.id}`;
});

const invoicePdfUrl = computed(() =>
  invoice.value ? `/api/invoices/${invoice.value.id}/pdf` : undefined
);

const invoicePublicPdfUrl = computed(() => {
  if (!invoice.value || !appUrl.value) return undefined;
  return `${appUrl.value}/api/public/invoices/${invoice.value.id}/pdf`;
});

const isPaid = computed(() => invoice.value?.status === "paid");

const paidAtDisplay = computed(() =>
  invoice.value?.paidAt ? formatDate(invoice.value.paidAt) : undefined
);
const dueDateDisplay = computed(() =>
  invoice.value?.dueDate ? formatDate(invoice.value.dueDate) : undefined
);

const totalsHighlight = computed(() => {
  if (isPaid.value) {
    return {
      label: "Total collected",
      containerClass: "border-emerald-200/70 bg-emerald-50/70",
      titleClass: "text-emerald-600",
      amountClass: "text-emerald-700",
    } as const;
  }

  return {
    label: "Total due",
    containerClass: "border-amber-200/70 bg-amber-50/60",
    titleClass: "text-amber-600",
    amountClass: "text-amber-700",
  } as const;
});

const statusActions = computed(() => {
  if (!invoice.value) return [];
  const { id, status } = invoice.value;
  const actions: { label: string; action: () => void | Promise<void> }[] = [];

  if (status !== "paid") {
    actions.push({ label: "Mark as paid", action: () => markPaid(id) });
  }

  if (status !== "sent") {
    actions.push({
      label: "Mark as sent",
      action: () => updateStatus(id, "sent"),
    });
  }

  if (status !== "overdue") {
    actions.push({
      label: "Mark as overdue",
      action: () => updateStatus(id, "overdue"),
    });
  }

  return actions;
});

const shareMessage = computed(() => {
  if (!invoice.value || !client.value) return "";
  const amount = totals.value
    ? formatCurrency(totals.value.grandTotal, invoiceCurrency.value)
    : "";
  const link = invoicePublicUrl.value;

  const pdfLink = invoicePublicPdfUrl.value;

  if (isPaid.value) {
    const paidOn = paidAtDisplay.value ? ` on ${paidAtDisplay.value}` : "";
    const receiptLine = link ? `\nReceipt: ${link}` : "";
    const pdfLine = pdfLink ? `\nPDF copy: ${pdfLink}` : "";
    return `Hi ${client.value.fullName}, thanks for settling invoice ${invoice.value.invoiceNumber}${paidOn}. We've recorded your payment of ${amount}.${receiptLine}${pdfLine}`;
  }

  const dueText = dueDateDisplay.value ? ` before ${dueDateDisplay.value}` : "";
  const paymentLine = link
    ? `Pay securely via Paystack${dueText} here: ${link}`
    : `Pay securely via Paystack${dueText}.`;
  const pdfLine = pdfLink ? `\nDownload PDF: ${pdfLink}` : "";

  return `Hi ${client.value.fullName}, here is your invoice ${invoice.value.invoiceNumber} for ${amount}. ${paymentLine}${pdfLine}\nThank you!`;
});

const encodedShareMessage = computed(() =>
  encodeURIComponent(shareMessage.value)
);

const candidateCountryCodes = computed<CountryCode[]>(() => {
  const codes: CountryCode[] = [];
  const currency = (
    invoice.value?.currency ??
    profile.value.currency ??
    ""
  ).toUpperCase();
  const currencyCountry = currencyCountryMap[currency] ?? undefined;
  if (currencyCountry) {
    codes.push(currencyCountry);
  }
  for (const code of fallbackCountryCodesBase) {
    if (!codes.includes(code)) codes.push(code);
  }
  return codes;
});

const tryParseInternational = (raw: string, country?: CountryCode) => {
  try {
    const parsed = parsePhoneNumberFromString(raw, country);
    if (parsed?.isValid()) {
      return parsed;
    }
  } catch (error) {
    // ignore parsing errors and fall back to heuristics
  }
  return undefined;
};

const defaultWhatsappCountryCode = computed(() => {
  const currency = (
    invoice.value?.currency ??
    profile.value.currency ??
    ""
  ).toUpperCase();
  const fromCurrency = currencyDialCodeMap[currency];
  if (fromCurrency) return fromCurrency;

  const fallbackNumbers = [profile.value.whatsappNumber, profile.value.phone];
  for (const number of fallbackNumbers) {
    if (!number) continue;
    const parsed = tryParseInternational(number);
    if (parsed) {
      return parsed.countryCallingCode;
    }
  }

  return undefined;
});

const normaliseWhatsappNumber = (input?: string | null) => {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const direct = tryParseInternational(trimmed);
  if (direct) return direct.number.replace(/^\+/, "");

  let digitsOnly = trimmed.replace(/\D+/g, "");

  const heuristicCountries: CountryCode[] = [];
  if (digitsOnly.length === 11 && digitsOnly.startsWith("07")) {
    heuristicCountries.push("GB");
  }
  if (digitsOnly.length === 10 && digitsOnly.startsWith("0")) {
    heuristicCountries.push("GH");
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    heuristicCountries.push("NG");
  }

  const candidates = [
    ...new Set([...heuristicCountries, ...candidateCountryCodes.value]),
  ];

  for (const country of candidates) {
    const attempt = tryParseInternational(trimmed, country);
    if (attempt) return attempt.number.replace(/^\+/, "");
  }

  digitsOnly = trimmed.replace(/\D+/g, "");
  if (!digitsOnly) return undefined;

  if (digitsOnly.startsWith("00")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (defaultWhatsappCountryCode.value) {
    if (digitsOnly.startsWith("0") && digitsOnly.length >= 9) {
      return `${defaultWhatsappCountryCode.value}${digitsOnly.slice(1)}`;
    }

    if (digitsOnly.length <= 10 && digitsOnly.length >= 6) {
      const national = digitsOnly.startsWith("0")
        ? digitsOnly.slice(1)
        : digitsOnly;
      return `${defaultWhatsappCountryCode.value}${national}`;
    }
  }

  return digitsOnly.length >= 8 ? digitsOnly : undefined;
};

const whatsappRecipient = computed(() => {
  const candidates = [client.value?.whatsappNumber, client.value?.phone];
  for (const candidate of candidates) {
    const normalised = normaliseWhatsappNumber(candidate);
    if (normalised) {
      return normalised;
    }
  }
  return undefined;
});

const whatsappShareUrl = computed(() => {
  if (!whatsappRecipient.value || !shareMessage.value) return undefined;
  return `https://wa.me/${whatsappRecipient.value}?text=${encodedShareMessage.value}`;
});

const smsShareUrl = computed(() => {
  if (!client.value?.phone || !shareMessage.value) return undefined;
  return `sms:${client.value.phone}?body=${encodedShareMessage.value}`;
});

const shareEmailSubject = computed(() =>
  invoice.value ? `Invoice ${invoice.value.invoiceNumber}` : "Invoice"
);
const encodedEmailSubject = computed(() =>
  encodeURIComponent(shareEmailSubject.value)
);

const emailShareUrl = computed(() => {
  if (!client.value?.email || !shareMessage.value) return undefined;
  return `mailto:${client.value.email}?subject=${encodedEmailSubject.value}&body=${encodedShareMessage.value}`;
});

const goBack = () => {
  router.push("/app/invoices");
};

const isInitializingPayment = ref(false);

const canEditInvoice = computed(() =>
  invoice.value ? ["draft", "sent"].includes(invoice.value.status) : false
);

const editInvoiceLink = computed(() =>
  invoice.value ? `/app/invoices/new?edit=${invoice.value.id}` : undefined
);

const launchPaystackPayment = async () => {
  if (!invoice.value) return;

  if (isPaid.value) {
    toast.add({
      title: "Invoice already paid",
      description:
        "This invoice is already marked as paid, so there is no active Paystack checkout link.",
      color: "warning",
    });
    return;
  }

  isInitializingPayment.value = true;

  try {
    const response = await $fetch<{ authorizationUrl: string }>(
      "/api/paystack/initialize",
      {
        method: "POST",
        body: { invoiceId: invoice.value.id },
      }
    );

    if (!response.authorizationUrl) {
      throw new Error("Paystack did not return an authorization link");
    }

    window.open(response.authorizationUrl, "_blank", "noopener");
  } catch (error) {
    const providerMessage = (error as { data?: { providerMessage?: string } })
      .data?.providerMessage;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to launch Paystack checkout",
      description:
        providerMessage || fallback || "Please try again in a few minutes.",
      color: "error",
    });
  } finally {
    isInitializingPayment.value = false;
  }
};

const updateStatus = async (id: string, status: InvoiceStatus) => {
  try {
    await setStatus(id, status);
    toast.add({
      title: "Invoice updated",
      description: `Status changed to ${status}.`,
      color: "success",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to update invoice status.";
    toast.add({
      title: "Status update failed",
      description: message,
      color: "error",
    });
  }
};

const markInvoiceShared = async () => {
  if (!invoice.value) return;
  try {
    await markShared(invoice.value.id);
  } catch (error) {
    console.error("Failed to record invoice share", error);
  }
};

const copyShareLink = async () => {
  if (!invoicePublicUrl.value) {
    toast.add({
      title: "Share link unavailable",
      description:
        "We couldn't build a public invoice link yet. Refresh the page and try again.",
      color: "warning",
    });
    return;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(invoicePublicUrl.value);
      await markInvoiceShared();
      toast.add({
        title: "Link copied",
        description:
          "Invoice share link is ready to paste into WhatsApp or SMS.",
        color: "success",
      });
      return;
    }
  } catch (error) {}

  await markInvoiceShared();

  toast.add({
    title: "Copy this link",
    description: invoicePublicUrl.value,
    color: "neutral",
  });
};

const copyPdfLink = async () => {
  if (!invoicePublicPdfUrl.value) {
    toast.add({
      title: "PDF link unavailable",
      description: "Generate the invoice PDF first or refresh the page.",
      color: "warning",
    });
    return;
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(invoicePublicPdfUrl.value);
      await markInvoiceShared();
      toast.add({
        title: "PDF link copied",
        description: "Share the PDF invoice with your client.",
        color: "success",
      });
      return;
    }
  } catch (error) {}

  await markInvoiceShared();

  toast.add({
    title: "PDF link",
    description: invoicePublicPdfUrl.value,
    color: "neutral",
  });
};
</script>

<template>
  <div
    v-if="invoice"
    class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30"
  >
    <!-- Mobile Header -->
    <div
      class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200"
    >
      <div class="flex items-center justify-between p-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          size="sm"
          @click="goBack"
        >
          Back
        </UButton>
        <div class="text-center">
          <h1 class="font-semibold text-slate-900 text-lg">
            {{ invoice.invoiceNumber }}
          </h1>
        </div>
        <div class="w-16"></div>
        <!-- Spacer for centered title -->
      </div>
    </div>

    <div class="pb-24">
      <!-- Status Hero Section -->
      <div
        class="mt-6 relative overflow-hidden rounded-3xl"
        :class="[
          isPaid
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-r from-amber-500 to-orange-500',
        ]"
      >
        <div class="absolute inset-0 bg-black/10"></div>
        <div class="relative p-6 text-white">
          <div class="flex items-center justify-between mb-4">
            <InvoiceStatusPill
              :status="invoice.status"
              class="bg-white/20 backdrop-blur-sm"
            />
            <div class="text-right">
              <p class="text-sm opacity-90">
                {{ isPaid ? "Paid on" : "Due on" }}
              </p>
              <p class="font-semibold">
                {{ isPaid ? paidAtDisplay : dueDateDisplay }}
              </p>
            </div>
          </div>

          <div class="text-center py-4">
            <p class="text-sm opacity-90 mb-2">
              {{ isPaid ? "Amount Collected" : "Amount Due" }}
            </p>
            <p class="text-4xl font-bold">
              {{
                totals
                  ? formatCurrency(totals.grandTotal, invoiceCurrency)
                  : "-"
              }}
            </p>
          </div>

          <!-- Primary Actions -->
          <div class="flex gap-3 mt-6">
            <UButton
              v-if="!isPaid"
              color="neutral"
              class="flex-1 bg-white text-amber-600 hover:bg-white/90"
              :loading="isInitializingPayment"
              @click="launchPaystackPayment"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V7zm2 0v10h12V7H6zm2 2h8v2H8V9zm0 3h6v1H8v-1z"/>
                </svg>
              </template>
              Collect Payment
            </UButton>

            <UButton
              v-if="whatsappShareUrl"
              color="neutral"
              variant="outline"
              class="flex-1 border-white/30 text-white hover:bg-white/10"
              :href="whatsappShareUrl"
              target="_blank"
              @click="markInvoiceShared"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.488"/>
                </svg>
              </template>
              Send via WhatsApp
            </UButton>

            <UButton
              v-if="!whatsappShareUrl"
              color="neutral"
              variant="outline"
              class="flex-1 border-white/30 text-white hover:bg-white/10"
              @click="copyShareLink"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              </template>
              Share Link
            </UButton>
          </div>
        </div>
      </div>

      <!-- Client Info Card -->
      <div
        class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
            >
              <span class="text-blue-600 font-semibold text-sm">
                {{ (client?.fullName || "").charAt(0).toUpperCase() }}
              </span>
            </div>
            <div>
              <h3 class="font-semibold text-slate-900">
                {{ client?.fullName }}
              </h3>
              <p class="text-sm text-slate-500">
                {{ client?.businessName || "Individual client" }}
              </p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <div
            v-if="client?.whatsappNumber || client?.phone"
            class="flex items-center gap-3"
          >
            <div
              class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"
            >
              📱
            </div>
            <div>
              <p class="text-sm text-slate-500">WhatsApp/Phone</p>
              <p class="font-medium text-slate-900">
                {{ client?.whatsappNumber || client?.phone }}
              </p>
            </div>
          </div>

          <div v-if="client?.email" class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"
            >
              📧
            </div>
            <div>
              <p class="text-sm text-slate-500">Email</p>
              <p class="font-medium text-slate-900">{{ client?.email }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"
            >
              📅
            </div>
            <div>
              <p class="text-sm text-slate-500">Invoice Date</p>
              <p class="font-medium text-slate-900">
                {{ formatDate(invoice.issueDate) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Line Items Section -->
      <div
        class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h3 class="font-semibold text-slate-900 flex items-center gap-2">
            📝 Invoice Items
          </h3>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="item in invoice.lineItems"
            :key="item.id"
            class="p-6 hover:bg-slate-50/50 transition-colors"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="flex-1 min-w-0 mr-4">
                <h4 class="font-medium text-slate-900 leading-tight">
                  {{ item.description }}
                </h4>
                <div
                  class="flex items-center gap-4 mt-2 text-sm text-slate-500"
                >
                  <span>Qty: {{ item.quantity }}</span>
                  <span>×</span>
                  <span>{{
                    formatCurrency(item.unitPrice, invoiceCurrency)
                  }}</span>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-lg text-slate-900">
                  {{
                    formatCurrency(
                      item.quantity * item.unitPrice,
                      invoiceCurrency
                    )
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Totals Section -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-slate-600">Subtotal</span>
              <span class="font-medium text-slate-900">
                {{
                  totals
                    ? formatCurrency(totals.subtotal, invoiceCurrency)
                    : "-"
                }}
              </span>
            </div>

            <div
              v-if="totals && totals.taxTotal > 0"
              class="flex justify-between text-sm"
            >
              <span class="text-slate-600">Taxes</span>
              <span class="font-medium text-slate-900">
                {{ formatCurrency(totals.taxTotal, invoiceCurrency) }}
              </span>
            </div>

            <div
              v-if="totals && totals.discountTotal > 0"
              class="flex justify-between text-sm"
            >
              <span class="text-slate-600">Discounts</span>
              <span class="font-medium text-slate-900">
                -{{ formatCurrency(totals.discountTotal, invoiceCurrency) }}
              </span>
            </div>

            <div
              class="pt-3 border-t border-slate-200 flex justify-between items-center"
            >
              <span class="font-semibold text-slate-900">Total</span>
              <span
                class="text-2xl font-bold"
                :class="[isPaid ? 'text-emerald-600' : 'text-amber-600']"
              >
                {{
                  totals
                    ? formatCurrency(totals.grandTotal, invoiceCurrency)
                    : "-"
                }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Grid - Beautiful Cards -->
      <div class="mt-6 space-y-4">
        <!-- Primary Actions Row -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Edit Invoice -->
          <div
            v-if="canEditInvoice && editInvoiceLink"
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <NuxtLink :to="editInvoiceLink" class="block">
              <div class="absolute top-3 right-3">
                <div
                  class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <span class="text-white text-lg">✏️</span>
                </div>
              </div>
              <div class="text-white">
                <h4 class="font-bold text-lg mb-1">Edit Invoice</h4>
                <p class="text-sm opacity-90">Make changes</p>
              </div>
            </NuxtLink>
          </div>

          <!-- Download PDF -->
          <div
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 p-5 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <a
              :href="invoicePdfUrl"
              target="_blank"
              class="block"
              :class="{ 'pointer-events-none opacity-50': !invoicePdfUrl }"
            >
              <div class="absolute top-3 right-3">
                <div
                  class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <span class="text-white text-lg">📄</span>
                </div>
              </div>
              <div class="text-white">
                <h4 class="font-bold text-lg mb-1">Download PDF</h4>
                <p class="text-sm opacity-90">Save locally</p>
              </div>
            </a>
          </div>
        </div>

        <!-- Share Actions Grid -->
        <div
          class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div
            class="px-5 py-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-slate-100"
          >
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <span class="text-lg">📤</span> Share with Client
            </h3>
          </div>

          <div class="p-5 grid grid-cols-2 gap-3">
            <!-- WhatsApp - FIRST & MOST IMPORTANT! -->
            <div
              v-if="whatsappShareUrl"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-400 to-green-500 p-4 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <a
                :href="whatsappShareUrl"
                target="_blank"
                class="block"
                @click="markInvoiceShared"
              >
                <div class="text-center text-white">
                  <div class="text-2xl mb-2">
                    <svg
                      viewBox="0 0 24 24"
                      class="w-6 h-6 mx-auto text-white fill-current"
                    >
                      <path
                        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.097"
                      />
                    </svg>
                  </div>
                  <div class="font-semibold text-sm">WhatsApp</div>
                </div>
              </a>
            </div>

            <!-- SMS -->
            <div
              v-if="smsShareUrl"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <a :href="smsShareUrl" class="block">
                <div class="text-center text-white">
                  <div class="text-2xl mb-2">💬</div>
                  <div class="font-semibold text-sm">Send SMS</div>
                </div>
              </a>
            </div>

            <!-- Email -->
            <div
              v-if="emailShareUrl"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <a :href="emailShareUrl" class="block">
                <div class="text-center text-white">
                  <div class="mb-2">
                    <svg class="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div class="font-semibold text-sm">Send Email</div>
                </div>
              </a>
            </div>

            <!-- Copy Link (fallback if no WhatsApp) -->
            <div
              v-if="!whatsappShareUrl"
              class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 p-4 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              @click="copyShareLink"
            >
              <div class="text-center text-white">
                <div class="mb-2">
                  <svg class="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                  </svg>
                </div>
                <div class="font-semibold text-sm">Copy Link</div>
              </div>
            </div>

            <!-- PDF Link -->
            <div
              class="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              :class="{
                'opacity-50 pointer-events-none': !invoicePublicPdfUrl,
              }"
              @click="copyPdfLink"
            >
              <div class="text-center text-white">
                <div class="mb-2">
                  <svg class="w-6 h-6 mx-auto" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                </div>
                <div class="font-semibold text-sm">PDF Link</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status & Other Actions -->
        <div
          v-if="statusActions.length > 0 || invoicePublicUrl"
          class="space-y-3"
        >
          <!-- Status Actions -->
          <div
            v-if="statusActions.length > 0"
            class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4"
          >
            <h4
              class="font-semibold text-slate-800 mb-3 flex items-center gap-2"
            >
              <span class="text-lg">⚙️</span> Update Status
            </h4>
            <div class="grid grid-cols-1 gap-2">
              <button
                v-for="action in statusActions"
                :key="action.label"
                @click="action.action()"
                class="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg font-medium text-slate-700 transition-colors text-left"
              >
                {{ action.label }}
              </button>
            </div>
          </div>

          <!-- Client View -->
          <div
            v-if="invoicePublicUrl"
            class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
          >
            <a :href="invoicePublicUrl" target="_blank" class="block">
              <div class="absolute top-3 right-3">
                <div
                  class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <span class="text-white text-lg">🔍</span>
                </div>
              </div>
              <div class="text-white">
                <h4 class="font-bold text-lg mb-1">Client View</h4>
                <p class="text-sm opacity-90">Preview & pay</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Invoice Not Found State -->
  <div
    v-else
    class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center px-4"
  >
    <div class="bg-white rounded-3xl shadow-lg p-8 text-center max-w-md w-full">
      <div
        class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <span class="text-3xl">📄</span>
      </div>

      <h2 class="text-xl font-bold text-slate-900 mb-2">Invoice not found</h2>
      <p class="text-slate-600 mb-6">
        The invoice you're looking for might have been moved or deleted.
      </p>

      <UButton
        color="info"
        class="w-full justify-center py-3"
        icon="i-heroicons-arrow-left"
        @click="goBack"
      >
        Back to Invoices
      </UButton>
    </div>
  </div>
</template>
