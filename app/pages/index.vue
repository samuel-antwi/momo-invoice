<script setup lang="ts">
definePageMeta({ layout: "plain" });

const metrics = [
  { label: "Invoices paid within 24h", value: "78%" },
  { label: "Avg. time to create", value: "42 sec" },
  { label: "Overdue reduced", value: "63%" },
];

const features = [
  {
    title: "Made for Mobile Money",
    description:
      "Seamlessly collect payments through MTN, Vodafone, or AirtelTigo without switching between dashboards. One-tap payments for your customers.",
    icon: "i-heroicons-device-phone-mobile",
  },
  {
    title: "WhatsApp Integration",
    description:
      "Send invoices directly through WhatsApp with mobile-optimized views and automated reminder sequences that actually get results.",
    icon: "i-heroicons-chat-bubble-left-right",
  },
  {
    title: "Smart Automation",
    description:
      "Set up intelligent reminder workflows via WhatsApp, SMS, and email. Focus on your business while we handle collections.",
    icon: "i-heroicons-cog-6-tooth",
  },
];

const steps = [
  {
    step: "01",
    title: "Create",
    description:
      "Add client details and line items with smart tax and discount calculations.",
  },
  {
    step: "02",
    title: "Share",
    description:
      "Send mobile-optimized invoices via WhatsApp, SMS, or email instantly.",
  },
  {
    step: "03",
    title: "Get Paid",
    description:
      "Track payments automatically with real-time MoMo integration updates.",
  },
];
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav class="border-b border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-sm font-bold">M</span>
            </div>
            <span class="text-xl font-semibold text-gray-900">MoMoInvoice</span>
          </div>
          <div class="flex items-center gap-4">
            <UButton
              to="/auth"
              variant="ghost"
              class="text-gray-600 hover:text-gray-900"
            >
              Sign in
            </UButton>
            <UButton to="/auth" class="btn-primary"> Get started </UButton>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="py-20 sm:py-32">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <div class="mb-8">
            <span
              class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
            >
              <span class="h-2 w-2 rounded-full bg-green-500"></span>
              Now available in Ghana
            </span>
          </div>

          <h1
            class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
          >
            Professional invoicing for
            <span class="text-blue-600">Mobile Money</span>
          </h1>

          <p class="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            Create beautiful invoices, send them via WhatsApp, and get paid
            faster with seamless MTN, Vodafone, and AirtelTigo integration.
            Built specifically for Ghanaian businesses.
          </p>

          <div class="mt-10 flex items-center justify-center gap-4">
            <UButton to="/auth" size="lg" class="btn-primary px-8 py-3">
              Start free trial
            </UButton>
            <UButton variant="outline" size="lg" class="px-8 py-3">
              Watch demo
            </UButton>
          </div>

          <!-- Social Proof -->
          <div class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div
              v-for="metric in metrics"
              :key="metric.label"
              class="text-center"
            >
              <div class="text-3xl font-bold text-gray-900">
                {{ metric.value }}
              </div>
              <div class="text-sm text-gray-600">{{ metric.label }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Preview -->
    <section class="py-20 bg-gray-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl">
          <div
            class="rounded-2xl bg-white p-8 shadow-xl border border-gray-200"
          >
            <div class="grid gap-6 lg:grid-cols-2">
              <!-- Invoice Preview -->
              <div class="space-y-4">
                <div class="border border-gray-200 rounded-lg p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-900">
                      Glow & Go Beauty
                    </h3>
                    <span class="badge badge-warning">Due soon</span>
                  </div>
                  <div class="text-2xl font-bold text-gray-900 mb-2">
                    GH₵ 1,280.00
                  </div>
                  <p class="text-sm text-gray-600">
                    Invoice #GNB-2024-007 • Due in 2 days
                  </p>

                  <div class="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">WhatsApp share</span>
                      <span class="badge badge-success">Sent</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-gray-600">MTN MoMo collect</span>
                      <span class="font-semibold text-gray-900">GH₵ 1,280</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stats -->
              <div class="space-y-4">
                <div class="border border-gray-200 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-900 mb-4">
                    Workspace Overview
                  </h4>
                  <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div class="text-2xl font-bold text-green-600">12</div>
                      <div class="text-xs text-gray-600">Paid</div>
                    </div>
                    <div>
                      <div class="text-2xl font-bold text-amber-600">5</div>
                      <div class="text-xs text-gray-600">Outstanding</div>
                    </div>
                    <div>
                      <div class="text-2xl font-bold text-red-600">2</div>
                      <div class="text-xs text-gray-600">Overdue</div>
                    </div>
                  </div>
                </div>

                <div class="border border-gray-200 rounded-lg p-6">
                  <h4 class="font-semibold text-gray-900 mb-4">
                    Automated Reminders
                  </h4>
                  <ul class="space-y-2 text-sm text-gray-600">
                    <li class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                      WhatsApp reminder 3 days before
                    </li>
                    <li class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-green-500"></div>
                      SMS on due date
                    </li>
                    <li class="flex items-center gap-2">
                      <div class="h-2 w-2 rounded-full bg-amber-500"></div>
                      Email follow-up after due
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">
            Built for Ghana's payment reality
          </h2>
          <p class="mt-4 text-lg text-gray-600">
            Forget generic Western tools. We prioritize local networks,
            mobile-first design, and MoMo behaviors.
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="text-center"
          >
            <div
              class="mx-auto h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-6"
            >
              <UIcon :name="feature.icon" class="h-6 w-6 text-blue-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-4">
              {{ feature.title }}
            </h3>
            <p class="text-gray-600">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20 bg-gray-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">
            From invoice to payment in minutes
          </h2>
          <p class="mt-4 text-lg text-gray-600">
            Simple workflow that works on any device, optimized for mobile and
            3G connections.
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-3">
          <div
            v-for="(step, index) in steps"
            :key="step.title"
            class="relative"
          >
            <div class="text-center">
              <div
                class="mx-auto h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center mb-6"
              >
                <span class="text-xl font-bold text-white">{{
                  step.step
                }}</span>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-4">
                {{ step.title }}
              </h3>
              <p class="text-gray-600">{{ step.description }}</p>
            </div>

            <!-- Connector line -->
            <div
              v-if="index < steps.length - 1"
              class="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-300 transform translate-x-0"
            ></div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">
            Ready to get paid faster?
          </h2>
          <p class="mt-4 text-lg text-gray-600">
            Join hundreds of Ghanaian businesses already using MoMoInvoice to
            streamline their invoicing and payments.
          </p>

          <div class="mt-10 flex items-center justify-center gap-4">
            <UButton to="/auth" size="lg" class="btn-primary px-8 py-3">
              Start free trial
            </UButton>
            <UButton
              to="mailto:hello@momoinvoice.com"
              variant="outline"
              size="lg"
              class="px-8 py-3"
            >
              Contact sales
            </UButton>
          </div>

          <p class="mt-6 text-sm text-gray-500">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-200 bg-white py-12">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <div class="flex items-center justify-center gap-3 mb-4">
            <div
              class="h-6 w-6 rounded bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-xs font-bold">M</span>
            </div>
            <span class="text-lg font-semibold text-gray-900">MoMoInvoice</span>
          </div>
          <p class="text-sm text-gray-600">
            © {{ new Date().getFullYear() }} MoMoInvoice. Proudly crafted in
            Accra, Ghana.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
