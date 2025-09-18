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
      return { color: "text-green-600", bg: "bg-green-50", icon: "💰" };
    case "blue":
      return { color: "text-blue-600", bg: "bg-blue-50", icon: "📊" };
    case "rose":
      return { color: "text-red-600", bg: "bg-red-50", icon: "⚠️" };
    case "amber":
      return { color: "text-amber-600", bg: "bg-amber-50", icon: "👥" };
    default:
      return { color: "text-gray-600", bg: "bg-gray-50", icon: "📈" };
  }
});
</script>

<template>
  <div class="stat-card">
    <div class="flex items-center justify-between mb-3">
      <div
        :class="[
          'h-8 w-8 rounded-lg flex items-center justify-center text-sm',
          accentConfig.bg,
        ]"
      >
        <span>{{ props.icon || accentConfig.icon }}</span>
      </div>
    </div>

    <div class="stat-value">{{ value }}</div>
    <div class="stat-label">{{ title }}</div>
    <div v-if="props.subLabel" class="stat-sublabel">{{ props.subLabel }}</div>
  </div>
</template>
