<script setup lang="ts">
import { computed, ref } from "vue";
import { useInvoices } from "~/composables/useInvoices";
import type { ReminderTemplateSetting } from "~/types/models";
import { demoData } from "~/utils/demo-data";

const { invoices, overdueInvoices, invoicesDueSoon } = useInvoices();

const templates = ref<ReminderTemplateSetting[]>([...demoData.reminderTemplateSettings]);

const reminderQueue = computed(() => {
  const upcoming = invoicesDueSoon.value.map((invoice) => ({
    invoiceId: invoice.id,
    scheduledFor: new Date(invoice.dueDate).toISOString(),
    status: "scheduled",
    channel: "whatsapp" as const,
  }));

  const overdue = overdueInvoices.value.map((invoice) => ({
    invoiceId: invoice.id,
    scheduledFor: new Date().toISOString(),
    status: "scheduled",
    channel: "sms" as const,
  }));

  return [...upcoming, ...overdue];
});

const toggleTemplate = (templateId: string) => {
  templates.value = templates.value.map((template) =>
    template.id === templateId ? { ...template, enabled: !template.enabled } : template,
  );
};

const invoiceNumber = (id: string) => invoices.value.find((invoice) => invoice.id === id)?.invoiceNumber ?? "Unknown";
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-slate-900">Reminders</h2>
        <p class="text-sm text-slate-500">Automate polite nudges across WhatsApp, SMS, and email.</p>
      </div>
      <UButton color="primary" icon="i-heroicons-bell-alert">New template</UButton>
    </section>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)]">
      <UCard :ui="{ body: 'space-y-5 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <h3 class="text-base font-semibold text-slate-900">Reminder schedule</h3>
        <ul class="space-y-3">
          <li
            v-for="template in templates"
            :key="template.id"
            class="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ template.label }}</p>
              <p class="text-xs text-slate-500">
                {{ template.offsetDays === 0
                  ? 'On due day'
                  : template.offsetDays > 0
                    ? `${template.offsetDays} days after due`
                    : `${Math.abs(template.offsetDays)} days before due` }}
                • {{ template.channel.toUpperCase() }}
              </p>
            </div>
            <UToggle :model-value="template.enabled" @update:model-value="() => toggleTemplate(template.id)" />
          </li>
        </ul>
      </UCard>

      <UCard :ui="{ body: 'space-y-4 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Upcoming reminders</h3>
          <p class="text-sm text-slate-500">These will send automatically once backend integrations are live.</p>
        </div>
        <ul class="space-y-3">
          <li
            v-for="item in reminderQueue"
            :key="item.invoiceId"
            class="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold text-slate-900">Invoice {{ invoiceNumber(item.invoiceId) }}</p>
              <p class="text-xs text-slate-500">
                {{ new Date(item.scheduledFor).toLocaleString() }} • {{ item.channel.toUpperCase() }}
              </p>
            </div>
            <UBadge color="primary" variant="soft">{{ item.status }}</UBadge>
          </li>
        </ul>
        <p v-if="!reminderQueue.length" class="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3 text-sm text-slate-500">
          No reminders scheduled right now.
        </p>
      </UCard>
    </div>

    <UCard :ui="{ body: 'space-y-4 p-6' }" class="border border-slate-200/80 bg-white/80 shadow-sm shadow-slate-100">
      <h3 class="text-base font-semibold text-slate-900">How reminders work</h3>
      <ol class="list-decimal space-y-2 pl-4 text-sm text-slate-600">
        <li>Invoices move into the reminder queue when they are due soon or overdue.</li>
        <li>We send a WhatsApp template first, then SMS via Africa's Talking if unpaid.</li>
        <li>Email is used as a backup for clients without WhatsApp/SMS availability.</li>
        <li>All actions are logged inside the invoice history.</li>
      </ol>
      <p class="text-sm text-slate-500">
        In this dummy environment, reminders are simulated. Once Supabase hooks are ready we will trigger real messages
        and track delivery receipts.
      </p>
    </UCard>
  </div>
</template>
