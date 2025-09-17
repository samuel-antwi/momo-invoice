<script setup lang="ts">
import { reactive, watch } from "vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";

const { profile, updateProfile, updateThemeColor } = useSession();
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

const saveProfile = () => {
  updateProfile({
    name: form.name,
    email: form.email,
    phone: form.phone,
    whatsappNumber: form.whatsappNumber,
    address: form.address,
  });
  updateThemeColor(form.themeColor);
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="space-y-1">
      <h2 class="text-xl font-semibold text-slate-900">Settings</h2>
      <p class="text-sm text-slate-500">
        Manage business details, brand colours, and communication preferences.
      </p>
    </section>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)]">
      <UCard
        :ui="{ body: 'space-y-4 p-6' }"
        class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100"
      >
        <form class="space-y-4" @submit.prevent="saveProfile">
          <div class="grid gap-4 md:grid-cols-2">
            <UFormGroup label="Business name" required>
              <UInput v-model="form.name" required size="lg" />
            </UFormGroup>
            <UFormGroup label="Email (fallback)">
              <UInput v-model="form.email" type="email" size="lg" />
            </UFormGroup>
            <UFormGroup label="Primary phone">
              <UInput v-model="form.phone" size="lg" />
            </UFormGroup>
            <UFormGroup label="WhatsApp number">
              <UInput v-model="form.whatsappNumber" size="lg" />
            </UFormGroup>
          </div>

          <UFormGroup label="Address / location">
            <UInput v-model="form.address" size="lg" />
          </UFormGroup>

          <div
            class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-3">
              <UFormGroup label="Theme colour" class="!mb-0">
                <input
                  v-model="form.themeColor"
                  type="color"
                  class="h-12 w-16 cursor-pointer rounded-xl border border-slate-200"
                />
              </UFormGroup>
              <span class="text-sm text-slate-500"
                >Applies to invoice accents and navigation.</span
              >
            </div>
            <UButton type="submit" color="primary" size="lg"
              >Save changes</UButton
            >
          </div>
        </form>
      </UCard>

      <UCard
        :ui="{ body: 'space-y-5 p-6' }"
        class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100"
      >
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Plan
            </p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ profile.plan.toUpperCase() }}
            </p>
            <p v-if="profile.plan === 'free'" class="text-xs text-amber-600">
              Upgrade to unlock unlimited invoices.
            </p>
          </div>
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Invoices
            </p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ invoices.length }}
            </p>
            <p class="text-xs text-slate-500">
              {{
                invoices.filter((invoice) => invoice.status === "paid").length
              }}
              paid to date
            </p>
          </div>
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Clients
            </p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ clients.length }}
            </p>
            <p class="text-xs text-slate-500">Grow your relationships.</p>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold text-slate-900">
            Reminder channels
          </h4>
          <p class="text-sm text-slate-500">
            WhatsApp and SMS reminders are active in the dummy environment.
          </p>
          <ul class="space-y-2 text-sm text-slate-600">
            <li class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              WhatsApp reminders (recommended)
            </li>
            <li class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              SMS reminders via Africa's Talking
            </li>
            <li class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              Email backup for edge cases
            </li>
          </ul>
        </div>
      </UCard>
    </div>
  </div>
</template>
