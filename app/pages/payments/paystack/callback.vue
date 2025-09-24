<script setup lang="ts">
import { computed, onMounted } from "vue";

const route = useRoute();
const router = useRouter();
const { refresh } = useInvoices();

const reference = computed(() => (route.query.reference as string | undefined) ?? (route.query.trxref as string | undefined));

onMounted(() => {
  refresh();
});

const goToInvoices = () => {
  router.push("/app/invoices");
};
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
    <div class="w-full max-w-lg rounded-3xl bg-white p-10 text-center shadow-xl">
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">Payment complete</p>
      <h1 class="mt-3 text-3xl font-semibold text-slate-900">Thanks for the payment</h1>
      <p class="mt-4 text-sm text-slate-600">
        We received confirmation from Paystack and linked it to your invoice. Reference
        <span v-if="reference" class="font-mono font-semibold text-slate-900">{{ reference }}</span>
        <span v-else class="font-semibold text-slate-900">(pending reference)</span>
        is now marked as paid in your dashboard.
      </p>
      <UButton class="mt-8" color="primary" icon="i-heroicons-arrow-right" @click="goToInvoices">
        Return to invoices
      </UButton>
    </div>
    <p class="mt-6 text-xs text-slate-400">
      Having trouble? Contact support at hello@momoinvoice.com with your payment reference.
    </p>
  </div>
</template>
