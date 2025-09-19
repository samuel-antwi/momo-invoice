<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useSession } from "~/composables/useSession";

const route = useRoute();
const { profile, logout } = useSession();

const navigation = [
  { label: "Dashboard", to: "/app/dashboard", icon: "i-heroicons-home-modern" },
  { label: "Invoices", to: "/app/invoices", icon: "i-heroicons-document-text" },
  { label: "Clients", to: "/app/clients", icon: "i-heroicons-users" },
  { label: "Reminders", to: "/app/reminders", icon: "i-heroicons-bell-alert" },
];

const activePath = computed(() => route.path);
const activeNavLabel = computed(
  () =>
    navigation.find((item) => activePath.value.startsWith(item.to))?.label ?? ""
);
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="sidebar hidden w-64 flex-shrink-0 lg:flex">
      <div class="flex flex-col w-full">
        <!-- Logo/Brand -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-sm font-bold">M</span>
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-900">MoMoInvoice</h1>
              <p class="text-xs text-gray-500">{{ profile.plan }} plan</p>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4">
          <div class="space-y-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              :class="[
                'nav-link',
                activePath.startsWith(item.to) ? 'active' : '',
              ]"
            >
              <UIcon :name="item.icon" class="h-5 w-5 mr-3" />
              <span>{{ item.label }}</span>
            </NuxtLink>
          </div>
        </nav>

        <!-- Help Section -->
        <div class="p-4 border-t border-gray-200">
          <div class="card p-4">
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Need help?</h3>
            <p class="text-xs text-gray-600 mb-3">
              Book a 15 minute onboarding call and we'll migrate your first
              invoices for free.
            </p>
            <UButton
              to="mailto:hello@momoinvoice.com"
              color="primary"
              class="w-full"
              size="sm"
            >
              Contact Support
            </UButton>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main-content flex-1">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl sm:text-2xl font-semibold text-gray-900">
                {{ activeNavLabel }}
              </h1>
              <p class="text-sm text-gray-600 mt-1 hidden sm:block">
                {{ profile.address }}
              </p>
            </div>
            <UButton
              variant="ghost"
              size="sm"
              class="flex items-center gap-2 sm:gap-3"
            >
              <UDropdown
                :items="[
                  [
                    {
                      label: 'Settings',
                      icon: 'i-heroicons-cog-6-tooth',
                      to: '/app/settings',
                    },
                  ],
                  [
                    {
                      label: 'Log out',
                      icon: 'i-heroicons-arrow-right-start-on-rectangle',
                      click: logout,
                    },
                  ],
                ]"
                :popper="{ placement: 'bottom-end' }"
              >
                <template #default>
                  <div class="flex items-center gap-2 sm:gap-3">
                    <UAvatar
                      :alt="profile.name"
                      :name="profile.name"
                      class="bg-blue-600"
                      size="sm"
                    />
                    <div class="text-right hidden sm:block">
                      <p class="text-sm font-medium text-gray-900">
                        {{ profile.name }}
                      </p>
                      <p class="text-xs text-gray-500">{{ profile.email }}</p>
                    </div>
                    <UIcon
                      name="i-heroicons-chevron-down"
                      class="h-4 w-4 text-gray-400"
                    />
                  </div>
                </template>
              </UDropdown>
            </UButton>
          </div>
        </header>

        <!-- Main Content Area -->
        <main class="p-4 sm:p-6 pb-20 lg:pb-6">
          <slot />
        </main>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 px-4 py-2 lg:hidden"
    >
      <div class="flex items-center justify-between max-w-md mx-auto">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
            activePath.startsWith(item.to)
              ? 'text-blue-600'
              : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          <UIcon :name="item.icon" class="h-5 w-5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
