<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import InvoiceStatusPill from "~/components/invoices/InvoiceStatusPill.vue";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";
import { useSession } from "~/composables/useSession";
import { calculateInvoiceTotals, formatCurrency, formatDate } from "~/utils/invoice-helpers";

const route = useRoute();
const router = useRouter();
const invoiceId = computed(() => route.params.id as string);

const { invoices, markPaid, setStatus } = useInvoices();
const { clients } = useClients();
const { profile } = useSession();
const toast = useToast();

const invoice = computed(() => invoices.value.find((item) => item.id === invoiceId.value));
const client = computed(() => clients.value.find((item) => item.id === invoice.value?.clientId));
const totals = computed(() => (invoice.value ? calculateInvoiceTotals(invoice.value) : null));

const isPaid = computed(() => invoice.value?.status === "paid");

const paidAtDisplay = computed(() => (invoice.value?.paidAt ? formatDate(invoice.value.paidAt) : undefined));
const dueDateDisplay = computed(() => (invoice.value?.dueDate ? formatDate(invoice.value.dueDate) : undefined));

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
  const actions: { label: string; action: () => void }[] = [];

  if (status !== "paid") {
    actions.push({ label: "Mark as paid", action: () => markPaid(id) });
  }

  if (status !== "sent") {
    actions.push({ label: "Mark as sent", action: () => setStatus(id, "sent") });
  }

  if (status !== "overdue") {
    actions.push({ label: "Mark as overdue", action: () => setStatus(id, "overdue") });
  }

  return actions;
});

const shareMessage = computed(() => {
  if (!invoice.value || !client.value) return "";
  const amount = totals.value ? formatCurrency(totals.value.grandTotal, profile.value.currency) : "";
  if (isPaid.value) {
    const paidOn = paidAtDisplay.value ? ` on ${paidAtDisplay.value}` : "";
    return `Hi ${client.value.fullName}, thanks for settling invoice ${invoice.value.invoiceNumber}${paidOn}. We've recorded your payment of ${amount}.`;
  }
  const dueText = dueDateDisplay.value ? ` before ${dueDateDisplay.value}` : "";
  return `Hi ${client.value.fullName}, here is your invoice ${invoice.value.invoiceNumber} for ${amount}. Pay securely via Paystack${dueText}. Thank you!`;
});

const encodedShareMessage = computed(() => encodeURIComponent(shareMessage.value));

const defaultWhatsappCountryCode = computed(() => {
  const currency = invoice.value?.currency ?? profile.value.currency;
  switch (currency?.toUpperCase()) {
    case "GHS":
      return "233"; // Ghana
    case "NGN":
      return "234"; // Nigeria
    case "KES":
      return "254"; // Kenya
    default:
      return undefined;
  }
});

const normaliseWhatsappNumber = (input?: string | null) => {
  if (!input) return undefined;

  let digitsOnly = input.replace(/\D+/g, "");
  if (!digitsOnly) return undefined;

  if (digitsOnly.startsWith("00")) {
    digitsOnly = digitsOnly.slice(2);
  }

  if (
    defaultWhatsappCountryCode.value &&
    digitsOnly.startsWith("0") &&
    digitsOnly.length === 10
  ) {
    return `${defaultWhatsappCountryCode.value}${digitsOnly.slice(1)}`;
  }

  if (defaultWhatsappCountryCode.value && digitsOnly.length === 9) {
    return `${defaultWhatsappCountryCode.value}${digitsOnly}`;
  }

  return digitsOnly;
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
const encodedEmailSubject = computed(() => encodeURIComponent(shareEmailSubject.value));

const emailShareUrl = computed(() => {
  if (!client.value?.email || !shareMessage.value) return undefined;
  return `mailto:${client.value.email}?subject=${encodedEmailSubject.value}&body=${encodedShareMessage.value}`;
});

const goBack = () => router.push("/app/invoices");

const isInitializingPayment = ref(false);

const launchPaystackPayment = async () => {
  if (!invoice.value) return;

  if (isPaid.value) {
    toast.add({
      title: "Invoice already paid",
      description: "This invoice is already marked as paid, so there is no active Paystack checkout link.",
      color: "amber",
    });
    return;
  }

  isInitializingPayment.value = true;

  try {
    const response = await $fetch<{ authorizationUrl: string }>("/api/paystack/initialize", {
      method: "POST",
      body: { invoiceId: invoice.value.id },
    });

    if (!response.authorizationUrl) {
      throw new Error("Paystack did not return an authorization link");
    }

    window.open(response.authorizationUrl, "_blank", "noopener");
  } catch (error) {
    const providerMessage = (error as { data?: { providerMessage?: string } }).data?.providerMessage;
    const fallback = error instanceof Error ? error.message : undefined;
    toast.add({
      title: "Unable to launch Paystack checkout",
      description: providerMessage || fallback || "Please try again in a few minutes.",
      color: "red",
    });
  } finally {
    isInitializingPayment.value = false;
  }
};
</script>

<template>
  <div v-if="invoice" class="flex min-w-0 flex-col gap-6 sm:gap-8">
    <div class="flex justify-start">
      <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" @click="goBack">
        Back
      </UButton>
    </div>

    <div
      class="glass-panel flex min-w-0 flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">Invoice detail</p>
        <h2 class="text-xl font-semibold text-slate-900 sm:text-2xl">{{ invoice.invoiceNumber }}</h2>
        <p class="text-sm text-slate-500">
          Issued {{ formatDate(invoice.issueDate) }}
          <span v-if="dueDateDisplay"> • Due {{ dueDateDisplay }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3 sm:justify-end">
        <InvoiceStatusPill :status="invoice.status" />
      </div>
    </div>

    <div class="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
      <div class="space-y-6 min-w-0">
        <div class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Client details</h3>
          <div class="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <p class="text-xs text-slate-500">Client name</p>
              <p class="text-sm font-semibold text-slate-900">{{ client?.fullName }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Business</p>
              <p class="text-sm font-semibold text-slate-900">{{ client?.businessName || 'Individual client' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">WhatsApp</p>
              <p class="text-sm text-slate-900">{{ client?.whatsappNumber || client?.phone }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Email</p>
              <p class="text-sm text-slate-900">{{ client?.email || 'Not provided' }}</p>
            </div>
          </div>
        </div>

        <div class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Quick actions</h3>
          <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <UButton
              v-for="action in statusActions"
              :key="action.label"
              color="gray"
              variant="ghost"
              class="w-full justify-center whitespace-normal"
              @click="action.action()"
            >
              {{ action.label }}
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              class="w-full justify-center whitespace-normal"
              :href="whatsappShareUrl"
              :disabled="!whatsappShareUrl"
              target="_blank"
              rel="noopener noreferrer"
              :title="!whatsappShareUrl ? 'Add a client WhatsApp or phone number to share instantly.' : undefined"
            >
              Share via WhatsApp
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              class="w-full justify-center whitespace-normal"
              :href="smsShareUrl"
              :disabled="!smsShareUrl"
            >
              Send SMS
            </UButton>
            <UButton
              color="gray"
              variant="ghost"
              class="w-full justify-center whitespace-normal"
              :href="emailShareUrl"
              :disabled="!emailShareUrl"
            >
              Email invoice
            </UButton>
            <UButton
              v-if="!isPaid"
              color="primary"
              icon="i-heroicons-credit-card"
              :loading="isInitializingPayment"
              class="w-full justify-center whitespace-normal"
              @click="launchPaystackPayment"
            >
              Collect via Paystack
            </UButton>
          </div>
        </div>

        <div v-if="!isPaid" class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Paystack checkout</h3>
          <p class="mt-2 text-sm text-slate-600">
            Launch a secure Paystack payment link and share it with your client. Once Paystack confirms the
            transfer, the invoice status will automatically flip to paid and appear on your dashboard.
          </p>
          <div class="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-sm text-amber-700">
            <p class="font-semibold">Amount due</p>
            <p class="mt-1 text-lg font-bold">
              {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '-' }}
            </p>
          </div>
          <UButton
            class="mt-4"
            color="primary"
            icon="i-heroicons-arrow-top-right-on-square"
            :loading="isInitializingPayment"
            @click="launchPaystackPayment"
          >
            Open Paystack checkout
          </UButton>
          <p class="mt-3 text-xs text-slate-500">
            We store the Paystack reference with this invoice so reminders and reconciliation stay in sync.
          </p>
        </div>

        <div v-else class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Payment record</h3>
          <p class="mt-2 text-sm text-slate-600">
            This invoice was recorded as paid{{ paidAtDisplay ? ` on ${paidAtDisplay}` : '' }}. You can still
            adjust the status or resend a receipt from the quick actions above.
          </p>
          <div class="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm text-emerald-700">
            <p class="font-semibold">Amount collected</p>
            <p class="mt-1 text-lg font-bold">
              {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '-' }}
            </p>
          </div>
          <p class="mt-3 text-xs text-slate-500">
            Paystack reconciled this payment automatically. Update the status if something looks off.
          </p>
        </div>
      </div>

      <div class="space-y-6 min-w-0">
        <div class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Line items</h3>
          <div class="mt-4 w-full overflow-x-auto rounded-2xl border border-slate-100">
            <table class="min-w-full divide-y divide-slate-100 text-sm sm:min-w-[32rem]">
              <thead class="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3 text-left">Description</th>
                  <th class="px-4 py-3 text-left">Qty</th>
                  <th class="px-4 py-3 text-left">Unit price</th>
                  <th class="px-4 py-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white/90">
                <tr v-for="item in invoice.lineItems" :key="item.id">
                  <td class="px-4 py-3 text-slate-900">{{ item.description }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ item.quantity }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ formatCurrency(item.unitPrice, profile.currency) }}</td>
                  <td class="px-4 py-3 text-slate-900">{{ formatCurrency(item.quantity * item.unitPrice, profile.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="glass-panel min-w-0 rounded-3xl p-5 sm:p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Totals</h3>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 sm:gap-4">
            <div class="flex items-center justify-between">
              <span>Subtotal</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.subtotal, profile.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Taxes</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.taxTotal, profile.currency) : '-' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span>Discounts</span>
              <span class="font-semibold text-slate-900">
                {{ totals ? formatCurrency(totals.discountTotal, profile.currency) : '-' }}
              </span>
            </div>
            <div
              class="flex items-center justify-between rounded-2xl px-4 py-3"
              :class="totalsHighlight.containerClass"
            >
              <span class="font-semibold" :class="totalsHighlight.titleClass">{{ totalsHighlight.label }}</span>
              <span class="text-lg font-semibold" :class="totalsHighlight.amountClass">
                {{ totals ? formatCurrency(totals.grandTotal, profile.currency) : '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="glass-panel flex flex-col items-center gap-4 rounded-3xl p-8 text-center sm:p-10" v-else>
    <p class="text-lg font-semibold text-slate-900">Invoice not found</p>
    <p class="text-sm text-slate-500">The invoice you are looking for might have been removed.</p>
    <UButton color="gray" variant="soft" class="w-full justify-center sm:w-auto" @click="goBack">
      Back to invoices
    </UButton>
  </div>
</template>
