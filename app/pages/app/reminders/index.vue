<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useInvoices } from "~/composables/useInvoices";
import { useSession } from "~/composables/useSession";
import type { ReminderTemplateSetting } from "~/types/models";

const { invoices, overdueInvoices, invoicesDueSoon } = useInvoices();
const { reminderTemplates } = useSession();

const templates = ref<ReminderTemplateSetting[]>([]);

watch(
  reminderTemplates,
  (value) => {
    templates.value = value.length ? [...value] : [];
  },
  { immediate: true },
);

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
  <div class="flex flex-col gap-8">
    <section class="glass-panel rounded-3xl p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-400">Reminders</p>
          <h2 class="mt-2 text-2xl font-semibold text-slate-900">Never chase payments manually again</h2>
          <p class="text-sm text-slate-500">Design automated WhatsApp, SMS, and email nudges for each invoice timeline.</p>
        </div>
        <UButton color="primary" icon="i-heroicons-bell-alert" size="lg">Add template</UButton>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
      <div class="glass-panel rounded-3xl p-6">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Reminder playbooks</h3>
        <p class="mt-1 text-sm text-slate-500">Turn on/off reminder touchpoints per invoice category.</p>
        <ul class="mt-6 space-y-4">
          <li
            v-for="template in templates"
            :key="template.id"
            class="rounded-2xl border border-slate-100 bg-white/90 px-4 py-4 shadow-sm"
          >
            <div class="flex items-center justify-between gap-3">
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
            </div>
          </li>
        </ul>
      </div>

      <div class="glass-panel rounded-3xl p-6">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Upcoming reminders</h3>
        <p class="mt-1 text-sm text-slate-500">These will trigger automatically once integrations are live.</p>
        <ul class="mt-6 space-y-4">
          <li
            v-for="item in reminderQueue"
            :key="item.invoiceId"
            class="rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900">Invoice {{ invoiceNumber(item.invoiceId) }}</p>
                <p class="text-xs text-slate-500">
                  {{ new Date(item.scheduledFor).toLocaleString() }} • {{ item.channel.toUpperCase() }}
                </p>
              </div>
              <UBadge color="primary" variant="soft">{{ item.status }}</UBadge>
            </div>
          </li>
        </ul>
        <p v-if="!reminderQueue.length" class="mt-6 rounded-2xl border border-slate-100 bg-white/90 px-4 py-4 text-sm text-slate-500">
          No reminders queued yet. Configure a template above to start automation.
        </p>
      </div>
    </div>

    <section class="glass-panel rounded-3xl p-6">
      <h3 class="text-lg font-semibold text-slate-900">How automated reminders keep cashflow healthy</h3>
      <ol class="mt-3 list-decimal space-y-2 pl-4 text-sm text-slate-600">
        <li>Invoice hits the "sent" state and automatically picks the right reminder playbook.</li>
        <li>WhatsApp nudges go out with local tone. SMS via Africa's Talking kicks in on due day.</li>
        <li>If unpaid after 48h, an email containing MoMo payment instructions follows up.</li>
        <li>All reminder events log inside the invoice history with timestamps and outcomes.</li>
      </ol>
      <p class="mt-4 text-sm text-slate-500">
        We’re shipping webhook-driven automation with Supabase next, so these schedules will fire in production with
        delivery receipts and retries.
      </p>
    </section>
  </div>
</template>
