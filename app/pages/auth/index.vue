<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSession } from "~/composables/useSession";

const router = useRouter();
const { profile, login } = useSession();

definePageMeta({ layout: "plain" });

const step = ref<"phone" | "otp" | "success">("phone");
const phoneNumber = ref(profile.value.whatsappNumber);
const otpCode = ref("");
const generatedOtp = ref("123456");
const message = ref("We will send a 6-digit code via WhatsApp/SMS.");

const sendOtp = () => {
  if (!phoneNumber.value) {
    message.value = "Enter your phone number first.";
    return;
  }
  generatedOtp.value = "123456";
  step.value = "otp";
  message.value = `We sent 123456 to ${phoneNumber.value} (demo mode).`;
};

const verifyOtp = () => {
  if (otpCode.value === generatedOtp.value) {
    login({ phone: phoneNumber.value, whatsappNumber: phoneNumber.value });
    step.value = "success";
    setTimeout(() => router.push("/"), 800);
  } else {
    message.value = "That code is not quite right. Try 123456 in demo mode.";
  }
};
</script>

<template>
  <div class="grid min-h-screen place-items-center bg-gradient-to-br from-amber-50 via-white to-slate-100 px-4 py-10">
    <UCard class="w-full max-w-md border border-amber-100/80 bg-white/80 shadow-xl shadow-amber-100/60">
      <template #header>
        <div class="space-y-2 text-center">
          <h1 class="text-2xl font-semibold text-slate-900">MoMoInvoice Login</h1>
          <p class="text-sm text-slate-500">Phone-first login with email fallback.</p>
        </div>
      </template>

      <div class="space-y-4">
        <UAlert color="primary" variant="soft" icon="i-heroicons-information-circle">
          {{ message }}
        </UAlert>

        <form v-if="step === 'phone'" class="space-y-4" @submit.prevent="sendOtp">
          <UFormGroup label="Mobile number" description="Include country code e.g. 233501234567">
            <UInput v-model="phoneNumber" placeholder="233501234567" size="lg" />
          </UFormGroup>
          <UButton type="submit" color="primary" size="lg" block>Send code</UButton>
        </form>

        <form v-else-if="step === 'otp'" class="space-y-4" @submit.prevent="verifyOtp">
          <UFormGroup label="Enter 6-digit code" description="Use 123456 for the demo">
            <UInput v-model="otpCode" maxlength="6" placeholder="123456" size="lg" />
          </UFormGroup>
          <div class="flex flex-col gap-3">
            <UButton type="submit" color="primary" size="lg" block>Verify</UButton>
            <UButton color="gray" variant="ghost" size="lg" block @click="step = 'phone'">Change number</UButton>
          </div>
        </form>

        <div v-else class="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-700">
          🎉 You are logged in. Redirecting to the dashboard…
        </div>
      </div>

      <template #footer>
        <p class="text-center text-xs text-slate-500">
          Need email login instead? Use <span class="font-medium text-amber-600">{{ profile.email }}</span>.
        </p>
      </template>
    </UCard>
  </div>
</template>
