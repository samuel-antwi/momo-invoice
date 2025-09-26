<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useInvoices } from "~/composables/useInvoices";

const toast = useToast();
const { invoices, overdueInvoices, invoicesDueSoon } = useInvoices();

// Fetch reminder templates
const { data: templates, refresh: refreshTemplates } = await useFetch("/api/reminders/templates");

// Modal states
const isTemplateModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const templateToDelete = ref<any>(null);
const editingTemplate = ref<any>(null);

// Form state
const templateForm = reactive({
  label: "",
  offsetDays: 0,
  channel: "whatsapp" as "whatsapp" | "sms" | "email",
  enabled: true,
});

// Channel options
const channelOptions = [
  { label: "WhatsApp", value: "whatsapp", icon: "i-simple-icons-whatsapp", color: "green" },
  { label: "SMS", value: "sms", icon: "i-heroicons-device-phone-mobile", color: "blue" },
  { label: "Email", value: "email", icon: "i-heroicons-envelope", color: "amber" },
];

// Timing presets
const timingPresets = [
  { label: "3 days before due", value: -3 },
  { label: "1 day before due", value: -1 },
  { label: "On due date", value: 0 },
  { label: "1 day after due", value: 1 },
  { label: "3 days after due", value: 3 },
  { label: "7 days after due", value: 7 },
];

// Computed reminder queue (simulated)
const reminderQueue = computed(() => {
  if (!templates.value?.length) return [];

  const queue: any[] = [];

  // Add reminders for due soon invoices
  invoicesDueSoon.value.forEach((invoice) => {
    const applicableTemplates = (templates.value || []).filter(t => t.enabled && t.offsetDays <= 0);
    applicableTemplates.forEach(template => {
      const scheduledDate = new Date(invoice.dueDate);
      scheduledDate.setDate(scheduledDate.getDate() + template.offsetDays);

      if (scheduledDate >= new Date()) {
        queue.push({
          id: `${invoice.id}-${template.id}`,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client?.fullName,
          templateLabel: template.label,
          scheduledFor: scheduledDate.toISOString(),
          channel: template.channel,
          status: "scheduled",
        });
      }
    });
  });

  // Add reminders for overdue invoices
  overdueInvoices.value.forEach((invoice) => {
    const applicableTemplates = (templates.value || []).filter(t => t.enabled && t.offsetDays > 0);
    applicableTemplates.forEach(template => {
      const scheduledDate = new Date(invoice.dueDate);
      scheduledDate.setDate(scheduledDate.getDate() + template.offsetDays);

      if (scheduledDate <= new Date()) {
        queue.push({
          id: `${invoice.id}-${template.id}`,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client?.fullName,
          templateLabel: template.label,
          scheduledFor: scheduledDate.toISOString(),
          channel: template.channel,
          status: "pending",
        });
      }
    });
  });

  return queue.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
});

// Open add template modal
const openAddModal = () => {
  editingTemplate.value = null;
  templateForm.label = "";
  templateForm.offsetDays = 0;
  templateForm.channel = "whatsapp";
  templateForm.enabled = true;
  isTemplateModalOpen.value = true;
};

// Open edit template modal
const openEditModal = (template: any) => {
  editingTemplate.value = template;
  templateForm.label = template.label;
  templateForm.offsetDays = template.offsetDays;
  templateForm.channel = template.channel;
  templateForm.enabled = template.enabled;
  isTemplateModalOpen.value = true;
};

// Save template
const saveTemplate = async () => {
  try {
    if (editingTemplate.value) {
      // Update existing template
      await $fetch(`/api/reminders/templates/${editingTemplate.value.id}`, {
        method: "PUT",
        body: templateForm,
      });
      toast.add({
        title: "Template updated",
        description: "Your reminder template has been updated successfully.",
        color: "emerald",
      });
    } else {
      // Create new template
      await $fetch("/api/reminders/templates", {
        method: "POST",
        body: templateForm,
      });
      toast.add({
        title: "Template created",
        description: "Your new reminder template has been created successfully.",
        color: "emerald",
      });
    }

    await refreshTemplates();
    isTemplateModalOpen.value = false;
  } catch (error) {
    toast.add({
      title: "Error saving template",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "red",
    });
  }
};

// Toggle template enabled status
const toggleTemplate = async (template: any) => {
  try {
    await $fetch(`/api/reminders/templates/${template.id}`, {
      method: "PUT",
      body: { enabled: !template.enabled },
    });
    await refreshTemplates();
  } catch (error) {
    toast.add({
      title: "Error updating template",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "red",
    });
  }
};

// Open delete confirmation
const confirmDelete = (template: any) => {
  templateToDelete.value = template;
  isDeleteModalOpen.value = true;
};

// Delete template
const deleteTemplate = async () => {
  if (!templateToDelete.value) return;

  try {
    await $fetch(`/api/reminders/templates/${templateToDelete.value.id}`, {
      method: "DELETE",
    });
    toast.add({
      title: "Template deleted",
      description: "The reminder template has been deleted successfully.",
      color: "emerald",
    });
    await refreshTemplates();
    isDeleteModalOpen.value = false;
    templateToDelete.value = null;
  } catch (error) {
    toast.add({
      title: "Error deleting template",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "red",
    });
  }
};

// Format offset days
const formatOffset = (days: number) => {
  if (days === 0) return "On due date";
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} after due`;
  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} before due`;
};

// Get channel icon
const getChannelIcon = (channel: string) => {
  const option = channelOptions.find(c => c.value === channel);
  return option?.icon || "i-heroicons-bell";
};

// Get channel color
const getChannelColor = (channel: string) => {
  const option = channelOptions.find(c => c.value === channel);
  return option?.color || "gray";
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30 pb-24">
    <!-- Header Section -->
    <div class="bg-white/95 mb-8 rounded-xl backdrop-blur-md border border-slate-200/60 shadow-xl shadow-slate-900/10">
      <div class="px-6 py-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11M19.75,3.19L18.33,4.61C20.04,6.3 21,8.6 21,11H23C23,8.07 21.84,5.25 19.75,3.19M1,11H3C3,8.6 3.96,6.3 5.67,4.61L4.25,3.19C2.16,5.25 1,8.07 1,11Z" />
                </svg>
              </div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">
                Reminders
              </p>
            </div>
            <h1 class="text-3xl font-bold text-slate-900 mb-1">
              Never chase payments manually again
            </h1>
            <p class="text-sm text-slate-600 leading-relaxed">
              Set up automated WhatsApp, SMS, and email reminders that send at the perfect time to get you paid faster.
            </p>
          </div>
          <UButton
            size="lg"
            color="amber"
            class="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/25"
            @click="openAddModal"
          >
            <template #leading>
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </template>
            Add Template
          </UButton>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid gap-8 xl:grid-cols-[1.5fr,1fr]">
      <!-- Templates Section -->
      <div class="space-y-6">
        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-amber-50/80 to-orange-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M17,11H7V9H17V11M15,15H7V13H15V15Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Reminder Templates</h3>
                <p class="text-sm text-slate-600">Configure when and how to remind clients</p>
              </div>
            </div>
          </div>
          <div class="p-6">
            <div v-if="templates && templates.length > 0" class="space-y-4">
              <div
                v-for="template in templates"
                :key="template.id"
                class="group relative rounded-xl border border-slate-200/60 bg-white/90 p-5 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-4 flex-1">
                    <div :class="`w-10 h-10 rounded-lg bg-${getChannelColor(template.channel)}-100 flex items-center justify-center flex-shrink-0`">
                      <UIcon
                        :name="getChannelIcon(template.channel)"
                        :class="`w-5 h-5 text-${getChannelColor(template.channel)}-600`"
                      />
                    </div>
                    <div class="flex-1">
                      <h4 class="text-base font-semibold text-slate-900 mb-1">{{ template.label }}</h4>
                      <div class="flex flex-wrap items-center gap-3 text-sm">
                        <span class="flex items-center gap-1.5">
                          <svg class="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                          </svg>
                          <span class="text-slate-600">{{ formatOffset(template.offsetDays) }}</span>
                        </span>
                        <span class="flex items-center gap-1.5">
                          <UIcon
                            :name="getChannelIcon(template.channel)"
                            :class="`w-4 h-4 text-${getChannelColor(template.channel)}-500`"
                          />
                          <span class="text-slate-600 capitalize">{{ template.channel }}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <UToggle
                      :model-value="template.enabled"
                      @update:model-value="() => toggleTemplate(template)"
                    />
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="gray"
                        icon="i-heroicons-pencil"
                        @click="openEditModal(template)"
                      />
                      <UButton
                        size="xs"
                        variant="ghost"
                        color="red"
                        icon="i-heroicons-trash"
                        @click="confirmDelete(template)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-12">
              <div class="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
                <svg class="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10,21H14A2,2 0 0,1 12,23A2,2 0 0,1 10,21M21,19V20H3V19L5,17V11C5,7.9 7.03,5.17 10,4.29C10,4.19 10,4.1 10,4A2,2 0 0,1 12,2A2,2 0 0,1 14,4C14,4.1 14,4.19 14,4.29C16.97,5.17 19,7.9 19,11V17L21,19M17,11A5,5 0 0,0 12,6A5,5 0 0,0 7,11V18H17V11Z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-slate-900 mb-2">No reminder templates yet</h3>
              <p class="text-sm text-slate-600 mb-6 max-w-sm mx-auto">
                Create your first reminder template to start automating payment follow-ups.
              </p>
              <UButton
                color="amber"
                class="bg-gradient-to-r from-amber-500 to-orange-600"
                @click="openAddModal"
              >
                Create First Template
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Queue Section -->
      <div class="space-y-6">
        <div class="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl overflow-hidden shadow-xl shadow-slate-900/10">
          <div class="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 px-6 py-4 border-b border-slate-200/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Reminder Queue</h3>
                <p class="text-sm text-slate-600">Upcoming automated reminders</p>
              </div>
            </div>
          </div>
          <div class="p-6">
            <div v-if="reminderQueue.length > 0" class="space-y-3 max-h-[500px] overflow-y-auto">
              <div
                v-for="item in reminderQueue"
                :key="item.id"
                class="rounded-lg border border-slate-200/60 bg-white/90 p-4 shadow-sm"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <p class="text-sm font-semibold text-slate-900">
                        Invoice #{{ item.invoiceNumber }}
                      </p>
                      <UBadge
                        :color="item.status === 'scheduled' ? 'blue' : 'amber'"
                        variant="subtle"
                        size="xs"
                      >
                        {{ item.status }}
                      </UBadge>
                    </div>
                    <p class="text-xs text-slate-600 mb-2">{{ item.clientName }}</p>
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
                        </svg>
                        {{ new Date(item.scheduledFor).toLocaleDateString() }}
                      </span>
                      <span class="flex items-center gap-1">
                        <UIcon
                          :name="getChannelIcon(item.channel)"
                          :class="`w-3.5 h-3.5 text-${getChannelColor(item.channel)}-500`"
                        />
                        <span class="capitalize">{{ item.channel }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <div class="w-12 h-12 rounded-full bg-blue-100 mx-auto mb-3 flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7Z" />
                </svg>
              </div>
              <p class="text-sm font-medium text-slate-900 mb-1">No reminders queued</p>
              <p class="text-xs text-slate-600">
                Templates will trigger automatically when invoices are sent
              </p>
            </div>
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/60 rounded-xl p-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z" />
              </svg>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-purple-900 mb-2">How it works</h4>
              <ul class="space-y-2 text-xs text-purple-700">
                <li class="flex items-start gap-2">
                  <span class="text-purple-500 mt-0.5">•</span>
                  <span>Templates define when to send reminders relative to invoice due dates</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-purple-500 mt-0.5">•</span>
                  <span>WhatsApp reminders go out first for instant delivery</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-purple-500 mt-0.5">•</span>
                  <span>SMS fallback via Africa's Talking for wider reach</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-purple-500 mt-0.5">•</span>
                  <span>Email as final backup with payment links</span>
                </li>
              </ul>
            </div>
          </div>
          <p class="text-xs text-purple-600 bg-purple-100/50 rounded-lg px-3 py-2">
            🚀 Integration with WhatsApp Business API and Africa's Talking coming soon
          </p>
        </div>
      </div>
    </div>

    <!-- Template Modal -->
    <UModal
      v-model:open="isTemplateModalOpen"
      :title="editingTemplate ? 'Edit Reminder Template' : 'Create Reminder Template'"
      description="Configure automated payment reminders"
    >
      <template #body>
        <form @submit.prevent="saveTemplate" class="space-y-6">
          <!-- Template Name -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">
              Template Name
            </label>
            <UInput
              v-model="templateForm.label"
              placeholder="e.g., Friendly reminder, Final notice"
              required
              size="lg"
              color="primary"
              :ui="{ base: 'focus:ring-amber-500 focus:border-amber-500' }"
            />
            <p class="text-xs text-slate-500">Give your reminder template a descriptive name</p>
          </div>

          <!-- When to Send -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">
              When to Send
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="preset in timingPresets"
                :key="preset.value"
                type="button"
                :class="[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  templateForm.offsetDays === preset.value
                    ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-500 ring-opacity-50'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                ]"
                @click="templateForm.offsetDays = preset.value"
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Custom:</span>
              <UInput
                v-model.number="templateForm.offsetDays"
                type="number"
                size="sm"
                class="w-20"
                :ui="{ base: 'text-center' }"
              />
              <span class="text-sm text-slate-600">days {{ templateForm.offsetDays >= 0 ? 'after' : 'before' }} due date</span>
            </div>
          </div>

          <!-- Channel Selection -->
          <div class="space-y-3">
            <label class="block text-sm font-medium text-slate-700">
              Delivery Channel
            </label>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="option in channelOptions"
                :key="option.value"
                type="button"
                :class="[
                  'relative flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 border-2',
                  templateForm.channel === option.value
                    ? `bg-${option.color}-50 border-${option.color}-500 ring-2 ring-${option.color}-500 ring-opacity-30`
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                ]"
                @click="templateForm.channel = option.value"
              >
                <UIcon
                  :name="option.icon"
                  :class="[
                    'w-6 h-6',
                    templateForm.channel === option.value
                      ? `text-${option.color}-600`
                      : 'text-slate-400'
                  ]"
                />
                <span
                  :class="[
                    'text-xs font-medium',
                    templateForm.channel === option.value
                      ? `text-${option.color}-700`
                      : 'text-slate-600'
                  ]"
                >
                  {{ option.label }}
                </span>
                <div
                  v-if="templateForm.channel === option.value"
                  :class="`absolute top-1 right-1 w-2 h-2 rounded-full bg-${option.color}-500`"
                />
              </button>
            </div>
          </div>

          <!-- Enable Toggle -->
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div class="flex-1">
              <label class="text-sm font-medium text-slate-700">
                Enable this template
              </label>
              <p class="text-xs text-slate-500 mt-1">Template will automatically send reminders when enabled</p>
            </div>
            <UToggle
              v-model="templateForm.enabled"
              :ui="{
                active: 'bg-amber-500'
              }"
            />
          </div>
        </form>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="outline"
            color="gray"
            size="md"
            @click="isTemplateModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="amber"
            size="md"
            class="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md"
            @click="saveTemplate"
          >
            {{ editingTemplate ? "Update Template" : "Create Template" }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Delete Template"
      description="This action cannot be undone"
      :icon="{
        name: 'i-heroicons-exclamation-triangle',
        color: 'red'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-700">
            Are you sure you want to delete the template
            <span v-if="templateToDelete" class="font-semibold">"{{ templateToDelete.label }}"</span>?
          </p>
          <div class="rounded-lg bg-red-50 border border-red-200 p-3">
            <p class="text-xs text-red-700">
              This will remove the template permanently. Any scheduled reminders using this template will not be affected.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            color="gray"
            @click="() => { isDeleteModalOpen = false; templateToDelete = null; }"
          >
            Cancel
          </UButton>
          <UButton
            color="red"
            @click="deleteTemplate"
          >
            Delete Template
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>