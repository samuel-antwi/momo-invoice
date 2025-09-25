<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ status: "draft" | "sent" | "paid" | "overdue" }>();

const label = computed(() => {
  if (props.status === "sent") return "Pending";
  return props.status.charAt(0).toUpperCase() + props.status.slice(1);
});

const badgeClass = computed(() => {
  switch (props.status) {
    case "paid":
      return "badge badge-success";
    case "sent":
      return "badge badge-warning";
    case "overdue":
      return "badge badge-danger";
    default:
      return "badge badge-gray";
  }
});
</script>

<template>
  <span :class="badgeClass">{{ label }}</span>
</template>
