<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  title: string;
  value: string;
  subLabel?: string;
  icon?: string;
  accent?: "emerald" | "blue" | "rose" | "amber";
}>();

const accentConfig = computed(() => {
  switch (props.accent) {
    case "emerald":
      return { color: "text-emerald-600", bg: "bg-emerald-50", icon: "💰" };
    case "blue":
      return { color: "text-blue-600", bg: "bg-blue-50", icon: "📊" };
    case "rose":
      return { color: "text-rose-600", bg: "bg-rose-50", icon: "⚠️" };
    case "amber":
      return { color: "text-blue-600", bg: "bg-blue-50", icon: "👥" };
    default:
      return { color: "text-slate-600", bg: "bg-slate-50", icon: "📈" };
  }
});
</script>

<template>
  <div class="stat-card">
    <div class="flex items-center justify-between mb-2 sm:mb-3">
      <div
        :class="[
          'h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-xs sm:text-sm',
          accentConfig.bg,
        ]"
      >
        <span>{{ props.icon || accentConfig.icon }}</span>
      </div>
    </div>

    <div class="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
      {{ value }}
    </div>
    <div class="text-xs sm:text-sm text-gray-600 font-medium">{{ title }}</div>
    <div v-if="props.subLabel" class="text-xs text-gray-500 mt-1">
      {{ props.subLabel }}
    </div>
  </div>
</template>
