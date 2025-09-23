<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSession } from "~/composables/useSession";

definePageMeta({ layout: "plain" });

const router = useRouter();
const { profile, updateProfile, pending } = useSession();

const name = ref("");
const email = ref("");
const phone = ref("");
const whatsappNumber = ref("");
const address = ref("");
const isSubmitting = ref(false);
const errorMessage = ref("");

const hydrate = () => {
  name.value = profile.value.name || "";
  email.value = profile.value.email || "";
  phone.value = profile.value.phone || "";
  whatsappNumber.value = profile.value.whatsappNumber || "";
  address.value = profile.value.address || "";
};

watch(
  () => profile.value,
  (value) => {
    if (!value) return;
    if (value.setupCompleted) {
      router.replace("/app/dashboard");
      return;
    }
    if (!name.value && (value.name || value.email)) {
      hydrate();
    }
  },
  { immediate: true, deep: false }
);

const isProfileLoading = computed(() => pending.value && !profile.value.id);

const canSubmit = computed(() => {
  return Boolean(name.value.trim() && email.value.trim() && !isSubmitting.value);
});

const handleSubmit = async () => {
  if (!canSubmit.value) return;
  isSubmitting.value = true;
  errorMessage.value = "";

  try {
    await updateProfile({
      name: name.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      whatsappNumber: whatsappNumber.value.trim(),
      address: address.value.trim(),
      setupCompleted: true,
    });
    router.replace("/app/dashboard").catch(() => {});
  } catch (error: any) {
    errorMessage.value = error?.message ?? "We couldn't save your business details. Please try again.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="mb-10 text-center">
        <div class="mx-auto mb-4 h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white text-xl font-bold">
          M
        </div>
        <h1 class="text-3xl font-semibold text-gray-900">Set up your business</h1>
        <p class="mt-2 text-sm text-gray-600">
          Tell us a few details so your invoices look professional from day one.
        </p>
      </div>

      <div class="bg-white shadow-lg rounded-2xl border border-gray-200 p-8">
        <div v-if="isProfileLoading" class="mb-6">
          <p class="text-sm text-gray-500">Loading your profile…</p>
        </div>

        <form class="space-y-8" @submit.prevent="handleSubmit">
          <div class="grid gap-6 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="business-name" class="block text-sm font-medium text-gray-700 mb-2">
                Business name
              </label>
              <input
                id="business-name"
                v-model="name"
                type="text"
                required
                placeholder="e.g. Glow & Go Beauty"
                class="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div class="sm:col-span-2">
              <label for="business-email" class="block text-sm font-medium text-gray-700 mb-2">
                Business email
              </label>
              <input
                id="business-email"
                v-model="email"
                type="email"
                required
                placeholder="hello@yourbusiness.com"
                class="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label for="business-phone" class="block text-sm font-medium text-gray-700 mb-2">
                Phone number
              </label>
              <input
                id="business-phone"
                v-model="phone"
                type="tel"
                placeholder="e.g. +233 20 000 0001"
                class="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label for="business-whatsapp" class="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp number
              </label>
              <input
                id="business-whatsapp"
                v-model="whatsappNumber"
                type="tel"
                placeholder="e.g. 233 20 000 0001"
                class="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div class="sm:col-span-2">
              <label for="business-address" class="block text-sm font-medium text-gray-700 mb-2">
                Business location or notes
              </label>
              <textarea
                id="business-address"
                v-model="address"
                rows="3"
                placeholder="Accra, Ghana"
                class="w-full rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              ></textarea>
            </div>
          </div>

          <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {{ errorMessage }}
          </div>

          <div class="flex items-center justify-end gap-4">
            <UButton
              type="submit"
              color="primary"
              size="lg"
              :disabled="!canSubmit"
              class="flex items-center justify-center gap-2"
            >
              <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              <span>{{ isSubmitting ? 'Saving…' : 'Save and continue' }}</span>
            </UButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
