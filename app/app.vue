<script setup lang="ts">
// Force Nuxt UI into light mode so components stay on-brand
const colorMode = useColorMode();

if (import.meta.client) {
  colorMode.preference = "light";
  colorMode.value = "light";
}
</script>

<template>
  <UApp>
    <ColorScheme preference="light" tag="div" class="min-h-screen bg-gray-50">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </ColorScheme>
  </UApp>
</template>
