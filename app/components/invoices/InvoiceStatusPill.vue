<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ status: "draft" | "sent" | "paid" | "overdue" }>();

const label = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1));

const color = computed(() => {
  switch (props.status) {
    case "paid":
      return "emerald";
    case "sent":
      return "blue";
    case "overdue":
      return "red";
    default:
      return "slate";
  }
});
</script>

<template>
  <UBadge :color="color" size="sm" variant="soft">{{ label }}</UBadge>
</template>
