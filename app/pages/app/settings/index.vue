<script setup lang="ts">
import { reactive, watch } from "vue";
import { useSession } from "~/composables/useSession";
import { useInvoices } from "~/composables/useInvoices";
import { useClients } from "~/composables/useClients";

const { profile, updateProfile, updateThemeColor, logout } = useSession();
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
  { deep: true },
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
  <div class="flex flex-col gap-8">
    <section class="glass-panel rounded-3xl p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">Workspace settings</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">Tune MoMoInvoice to your brand</h2>
          <p class="text-sm text-slate-500">Manage business identity, contact channels, and notification preferences.</p>
        </div>
        <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-right-start-on-rectangle" @click="logout">Log out</UButton>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
      <UCard :ui="{ body: 'space-y-5 p-6' }" class="glass-panel rounded-3xl border-none bg-white/90">
        <form class="space-y-5" @submit.prevent="saveProfile">
          <div class="grid gap-5 md:grid-cols-2">
            <UFormGroup label="Business name" required>
              <UInput v-model="form.name" size="lg" required />
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

          <UFormGroup label="Business address / location">
            <UTextarea v-model="form.address" rows="3" />
          </UFormGroup>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <UFormGroup label="Theme colour" class="!mb-0">
                <input v-model="form.themeColor" type="color" class="h-12 w-16 cursor-pointer rounded-xl border border-slate-200" />
              </UFormGroup>
              <p class="text-sm text-slate-500">Applies to mobile invoice accents, buttons, and reminder badges.</p>
            </div>
            <UButton type="submit" color="primary" size="lg" icon="i-heroicons-check">Save changes</UButton>
          </div>
        </form>
      </UCard>

      <div class="space-y-6">
        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Workspace health</h3>
          <div class="mt-5 grid gap-4 sm:grid-cols-3">
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Invoices</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ invoices.length }}</p>
              <p class="text-xs text-slate-500">{{ invoices.filter((invoice) => invoice.status === 'paid').length }} paid</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Clients</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ clients.length }}</p>
              <p class="text-xs text-slate-500">Paystack-ready contacts</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white/80 p-4 text-center">
              <p class="text-xs text-slate-500">Plan</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">{{ profile.plan.toUpperCase() }}</p>
              <p class="text-xs text-slate-500">Upgrade for automation</p>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-3xl p-6">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Reminder channels</h3>
          <p class="mt-2 text-sm text-slate-500">Simulated for now—going live with Supabase + Africa’s Talking integration.</p>
          <ul class="mt-4 space-y-3 text-sm text-slate-600">
            <li class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /> WhatsApp reminders (primary)
            </li>
            <li class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" /> SMS reminders via Africa's Talking
            </li>
            <li class="flex items-center gap-2">
              <span class="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" /> Email backup for edge cases
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
