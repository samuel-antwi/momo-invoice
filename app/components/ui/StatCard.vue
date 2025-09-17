<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  title: string;
  value: string;
  subLabel?: string;
  accent?: string;
}>();

const accentStyle = computed(() => (props.accent ? { color: props.accent } : {}));
</script>

<template>
  <UCard
    :ui="{
      body: 'flex flex-col gap-2.5 p-5 sm:p-6',
      header: 'hidden',
      footer: 'hidden',
    }"
    class="h-full border border-slate-200/80 bg-white/80 shadow-sm shadow-amber-100/40"
  >
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ props.title }}</p>
    <p class="text-3xl font-semibold" :style="accentStyle">{{ props.value }}</p>
    <p v-if="props.subLabel" class="text-sm text-slate-500">{{ props.subLabel }}</p>
  </UCard>
</template>
