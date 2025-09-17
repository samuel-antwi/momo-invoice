<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useSession } from "~/composables/useSession";

const route = useRoute();
const { profile } = useSession();

const navigation = [
  { label: "Dashboard", to: "/app/dashboard", icon: "📊" },
  { label: "Invoices", to: "/app/invoices", icon: "🧾" },
  { label: "Clients", to: "/app/clients", icon: "👥" },
  { label: "Reminders", to: "/app/reminders", icon: "⏰" },
  { label: "Settings", to: "/app/settings", icon: "⚙️" },
];

const activePath = computed(() => route.path);
const activeNavLabel = computed(() => {
  const current = navigation.find((item) => activePath.value.startsWith(item.to));
  return current?.label ?? "MoMoInvoice";
});
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-900">
    <aside
      class="hidden min-h-screen w-72 flex-col border-r border-slate-200 bg-white/90 px-6 py-8 shadow-sm backdrop-blur lg:flex"
    >
      <div class="mb-8 flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-2xl">
          💡
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-slate-500">{{ profile.plan.toUpperCase() }} PLAN</p>
          <p class="text-lg font-semibold text-slate-900">{{ profile.name }}</p>
        </div>
      </div>

      <nav class="flex flex-1 flex-col gap-1 text-sm">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-3 rounded-xl px-4 py-2.5 transition-colors',
            activePath.startsWith(item.to)
              ? 'bg-amber-100 text-amber-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
          ]"
        >
          <span class="text-lg">{{ item.icon }}</span>
          <span class="font-medium">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <p class="font-semibold text-amber-700">Paid invoices</p>
        <p class="mt-1 text-slate-600">Keep momentum going 💪🏽</p>
      </div>
    </aside>

    <div class="flex flex-1 flex-col">
      <header class="flex items-center justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 lg:px-10">
        <div>
          <h1 class="text-xl font-semibold md:text-2xl">
            {{ activeNavLabel }}
          </h1>
          <p class="text-sm text-slate-500">{{ profile.address }}</p>
        </div>

        <NuxtLink
          to="/app/settings"
          class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 shadow-sm backdrop-blur"
        >
          <UAvatar :alt="profile.name" :name="profile.name" class="bg-amber-100 text-amber-700" size="md" />
          <div class="flex flex-col">
            <span class="text-sm font-medium text-slate-900">{{ profile.name }}</span>
            <span class="text-xs text-slate-500">{{ profile.email }}</span>
          </div>
        </NuxtLink>
      </header>

      <main class="flex-1 px-4 pb-28 sm:px-6 lg:px-10 lg:pb-12">
        <slot />
      </main>

      <footer class="px-4 pb-24 pt-6 text-xs text-slate-500 sm:px-6 lg:px-10 lg:pb-10">
        © {{ new Date().getFullYear() }} MoMoInvoice. Made for Ghanaian SMEs.
      </footer>
    </div>

    <nav
      class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 py-2 text-xs font-medium text-slate-500 shadow-2xl shadow-black/5 backdrop-blur lg:hidden"
    >
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="[
          'flex flex-col items-center gap-1 text-center transition-colors',
          activePath.startsWith(item.to) ? 'text-amber-600' : 'hover:text-slate-900',
        ]"
      >
        <span class="text-lg">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
