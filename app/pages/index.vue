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
      "Seamlessly collect payments through MTN, Vodafone, or AirtelTigo. One-tap payments for your customers, instant confirmations for you.",
    icon: "i-heroicons-device-phone-mobile",
    highlight: "Instant MTN, Vodafone & AirtelTigo payouts",
  },
  {
    title: "WhatsApp Integration",
    description:
      "Send invoices directly through WhatsApp with mobile-optimized views and automated reminder sequences that actually get results.",
    icon: "i-heroicons-chat-bubble-left-right",
    highlight: "Mobile-first sharing that converts",
  },
  {
    title: "Smart Automation",
    description:
      "Set up intelligent reminder workflows via WhatsApp, SMS, and email. Focus on your business while we handle collections.",
    icon: "i-heroicons-cog-6-tooth",
    highlight: "Reminders tuned to Ghanaian payment habits",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small businesses just getting started",
    features: [
      "Up to 10 invoices per month",
      "Basic WhatsApp sharing",
      "MTN Mobile Money integration",
      "Email support",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    name: "Professional",
    price: "₵49",
    period: "/month",
    description: "For growing businesses that need more power",
    features: [
      "Unlimited invoices",
      "All Mobile Money providers",
      "Automated reminders",
      "WhatsApp & SMS integration",
      "Priority support",
      "Custom branding",
    ],
    cta: "Start trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For larger businesses with custom needs",
    features: [
      "Everything in Professional",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Advanced analytics",
    ],
    cta: "Contact sales",
    popular: false,
  },
];

const showMobileNav = ref(false);
const toggleMobileNav = () => {
  showMobileNav.value = !showMobileNav.value;
};
const closeMobileNav = () => {
  showMobileNav.value = false;
};

// Contact form
const contactForm = ref({
  name: "",
  email: "",
  company: "",
  message: "",
});
const contactLoading = ref(false);
const contactSubmitted = ref(false);

const submitContact = async () => {
  contactLoading.value = true;

  // Simulate form submission (replace with actual implementation)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  contactSubmitted.value = true;
  contactLoading.value = false;

  // Reset form after 3 seconds
  setTimeout(() => {
    contactSubmitted.value = false;
    contactForm.value = { name: "", email: "", company: "", message: "" };
  }, 3000);
};
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Navigation -->
    <nav class="relative z-20 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-20 items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600"
            >
              <span class="text-white text-sm font-bold">M</span>
            </div>
            <span class="text-xl font-semibold text-gray-900">MoMoInvoice</span>
          </div>

          <div class="hidden md:flex items-center gap-8">
            <a
              href="#features"
              class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
              >Features</a
            >
            <a
              href="#pricing"
              class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
              >Pricing</a
            >
            <a
              href="#contact"
              class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
              >Contact</a
            >
          </div>

          <div class="hidden md:flex items-center gap-3">
            <UButton
              to="/auth"
              variant="ghost"
              class="font-medium text-gray-700 transition-colors hover:text-gray-900"
            >
              Sign in
            </UButton>
            <UButton
              to="/auth"
              class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Get started
            </UButton>
          </div>

          <div class="flex items-center gap-3 md:hidden">
            <UButton
              to="/auth"
              size="sm"
              class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Get started
            </UButton>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:border-gray-300 hover:text-gray-900"
              @click="toggleMobileNav"
              :aria-expanded="showMobileNav"
              aria-controls="primary-navigation"
            >
              <span class="sr-only">Toggle navigation</span>
              <svg
                v-if="!showMobileNav"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg
                v-else
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showMobileNav"
        id="primary-navigation"
        class="md:hidden border-t border-gray-200 bg-white px-4 pb-6 shadow-lg"
      >
        <nav class="flex flex-col gap-4 pt-4">
          <a
            href="#features"
            class="text-base font-medium text-gray-700 transition-colors hover:text-gray-900"
            @click="closeMobileNav"
          >
            Features
          </a>
          <a
            href="#pricing"
            class="text-base font-medium text-gray-700 transition-colors hover:text-gray-900"
            @click="closeMobileNav"
          >
            Pricing
          </a>
          <a
            href="#contact"
            class="text-base font-medium text-gray-700 transition-colors hover:text-gray-900"
            @click="closeMobileNav"
          >
            Contact
          </a>

          <div class="mt-6 flex flex-col gap-3">
            <UButton
              to="/auth"
              variant="ghost"
              class="w-full font-medium text-gray-700 transition-colors hover:text-gray-900"
              @click="closeMobileNav"
            >
              Sign in
            </UButton>
            <UButton
              to="/auth"
              class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              @click="closeMobileNav"
            >
              Get started
            </UButton>
          </div>
        </nav>
      </div>
    </nav>

    <!-- Hero Section -->
    <section
      class="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 pt-16 pb-24 sm:pt-28 sm:pb-36"
    >
      <!-- Background decoration -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-600/20 blur-3xl"
        ></div>
        <div
          class="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-600/20 blur-3xl"
        ></div>
      </div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl text-center">
          <!-- Badge -->
          <div class="mb-8">
            <span
              class="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 ring-1 ring-blue-600/20"
            >
              <span class="h-2 w-2 rounded-full bg-green-500"></span>
              Now available in Ghana
            </span>
          </div>

          <!-- Headline -->
          <h1
            class="text-4xl font-bold tracking-tight text-gray-900 leading-tight sm:text-6xl lg:text-7xl"
          >
            Financial infrastructure
            <span class="block text-blue-600">for Ghana</span>
          </h1>

          <!-- Subheadline -->
          <p
            class="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto sm:mt-8 sm:text-xl sm:leading-9"
          >
            Join the thousands of Ghanaian businesses that use MoMoInvoice to
            create professional invoices, send them via WhatsApp, and get paid
            faster with seamless Mobile Money integration.
          </p>

          <!-- CTA Buttons -->
          <div
            class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <UButton
              to="/auth"
              size="xl"
              class="w-full sm:w-auto rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
            >
              Start now
            </UButton>
            <UButton
              variant="outline"
              size="xl"
              class="w-full sm:w-auto rounded-lg border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              Contact sales
            </UButton>
          </div>

          <!-- Social Proof Metrics -->
          <div class="mt-14 grid grid-cols-1 gap-6 sm:mt-20 sm:grid-cols-3 sm:gap-8 lg:gap-16">
            <div
              v-for="metric in metrics"
              :key="metric.label"
              class="text-center"
            >
              <div class="text-4xl font-bold text-gray-900 sm:text-5xl">
                {{ metric.value }}
              </div>
              <div
                class="mt-2 text-sm font-medium text-gray-600 uppercase tracking-wide"
              >
                {{ metric.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Product Demo Section -->
    <section class="py-24 sm:py-32 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl">
            See MoMoInvoice in action
          </h2>
          <p class="mt-6 text-lg text-gray-600">
            A complete invoicing solution designed specifically for Ghanaian
            businesses
          </p>
        </div>

        <!-- Product Preview -->
        <div class="relative mx-auto max-w-6xl">
          <div
            class="rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 p-8 shadow-2xl ring-1 ring-gray-200"
          >
            <div class="grid gap-8 lg:grid-cols-2">
              <!-- Dashboard Preview -->
              <div class="space-y-6">
                <div
                  class="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 sm:p-6"
                >
                  <div
                    class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <h3 class="text-xl font-semibold text-gray-900">
                      Dashboard Overview
                    </h3>
                    <span
                      class="inline-flex w-fit items-center rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-800 sm:self-auto"
                    >
                      Live
                    </span>
                  </div>

                  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div
                      class="flex flex-col gap-1 text-left sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4 sm:text-center sm:shadow-sm"
                    >
                      <div class="text-2xl font-bold text-green-600 sm:text-3xl">
                        ₵12,450
                      </div>
                      <div class="mt-1 text-sm text-gray-500 sm:mt-2 sm:text-xs">
                        Paid this month
                      </div>
                    </div>
                    <div
                      class="flex flex-col gap-1 text-left sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4 sm:text-center sm:shadow-sm"
                    >
                      <div class="text-2xl font-bold text-blue-600 sm:text-3xl">
                        ₵3,280
                      </div>
                      <div class="mt-1 text-sm text-gray-500 sm:mt-2 sm:text-xs">
                        Outstanding
                      </div>
                    </div>
                    <div
                      class="flex flex-col gap-1 text-left sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4 sm:text-center sm:shadow-sm"
                    >
                      <div class="text-2xl font-bold text-amber-600 sm:text-3xl">
                        ₵850
                      </div>
                      <div class="mt-1 text-sm text-gray-500 sm:mt-2 sm:text-xs">
                        Overdue
                      </div>
                    </div>
                  </div>

                  <div class="space-y-4">
                    <div
                      class="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:bg-gray-50 sm:p-4"
                    >
                      <span class="text-base font-semibold text-gray-900 sm:text-sm sm:font-medium"
                        >Glow & Go Beauty</span
                      >
                      <span
                        class="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                      >
                        Due soon
                      </span>
                    </div>
                    <div
                      class="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:bg-gray-50 sm:p-4"
                    >
                      <span class="text-base font-semibold text-gray-900 sm:text-sm sm:font-medium"
                        >Tech Solutions Ltd</span
                      >
                      <span
                        class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
                      >
                        Paid
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  class="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 sm:p-6"
                >
                  <h4 class="mb-4 text-xl font-semibold text-gray-900">
                    Mobile Money Integration
                  </h4>
                  <div class="space-y-4">
                    <div
                      class="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center"
                        >
                          <span class="text-xs font-bold text-yellow-800"
                            >M</span
                          >
                        </div>
                        <span class="text-sm font-medium text-gray-900"
                          >MTN Mobile Money</span
                        >
                      </div>
                      <span class="text-sm font-semibold text-green-600"
                        >Connected</span
                      >
                    </div>
                    <div
                      class="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center"
                        >
                          <span class="text-xs font-bold text-red-800">V</span>
                        </div>
                        <span class="text-sm font-medium text-gray-900"
                          >Vodafone Cash</span
                        >
                      </div>
                      <span class="text-sm font-semibold text-green-600"
                        >Connected</span
                      >
                    </div>
                    <div
                      class="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:rounded-xl sm:border sm:border-gray-100 sm:bg-white sm:p-4"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"
                        >
                          <span class="text-xs font-bold text-blue-800">A</span>
                        </div>
                        <span class="text-sm font-medium text-gray-900"
                          >AirtelTigo Money</span
                        >
                      </div>
                      <span class="text-sm font-semibold text-green-600"
                        >Connected</span
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- Invoice Preview -->
              <div class="space-y-6">
                <div
                  class="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 sm:p-6"
                >
                  <div
                    class="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <h3 class="text-xl font-semibold text-gray-900">
                      Invoice Preview
                    </h3>
                    <button
                      class="inline-flex items-center text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                    >
                      Send via WhatsApp
                    </button>
                  </div>

                  <div
                    class="rounded-2xl border-2 border-dashed border-gray-200 p-4 sm:p-6"
                  >
                    <div class="text-center mb-4">
                      <div class="text-sm font-medium text-gray-500">
                        INVOICE
                      </div>
                      <div class="text-lg font-bold text-gray-900">
                        #INV-2024-001
                      </div>
                    </div>

                    <div class="space-y-4 text-sm sm:text-base">
                      <div class="flex items-center justify-between gap-3">
                        <span class="text-gray-600">Website Design</span>
                        <span class="font-medium text-gray-900">₵2,500.00</span>
                      </div>
                      <div class="flex items-center justify-between gap-3">
                        <span class="text-gray-600">Logo Design</span>
                        <span class="font-medium text-gray-900">₵800.00</span>
                      </div>
                      <div class="flex items-center justify-between gap-3 border-t pt-3">
                        <span class="font-semibold text-gray-900">Total</span>
                        <span class="text-lg font-bold text-gray-900">
                          ₵3,300.00
                        </span>
                      </div>
                    </div>

                    <div class="mt-4 rounded-xl bg-blue-50 p-4">
                      <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                        Payment Options
                      </div>
                      <div class="text-sm text-blue-600">
                        MTN: *170*7*[code]# · Vodafone: *110*[code]#
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-200"
                >
                  <h4 class="text-lg font-semibold text-gray-900 mb-4">
                    Automated Reminders
                  </h4>
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <div class="h-2 w-2 rounded-full bg-green-500"></div>
                      <span class="text-sm text-gray-600"
                        >WhatsApp reminder sent</span
                      >
                      <span class="text-xs text-gray-400">2 days ago</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span class="text-sm text-gray-600"
                        >SMS reminder scheduled</span
                      >
                      <span class="text-xs text-gray-400">Due date</span>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="h-2 w-2 rounded-full bg-amber-500"></div>
                      <span class="text-sm text-gray-600"
                        >Email follow-up queued</span
                      >
                      <span class="text-xs text-gray-400">2 days overdue</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section
      id="features"
      class="py-24 sm:py-32 bg-gradient-to-br from-gray-50 to-white"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center mb-20">
          <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl">
            Built for Ghana's payment reality
          </h2>
          <p class="mt-6 text-lg text-gray-600">
            Forget generic Western tools. We prioritize local networks,
            mobile-first design, and Mobile Money behaviors.
          </p>
        </div>

        <div class="grid gap-8 sm:gap-10 lg:grid-cols-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="relative group"
          >
            <div
              class="hidden md:block md:absolute md:inset-0 md:translate-y-4 md:rounded-3xl md:bg-gradient-to-br md:from-blue-500/10 md:via-transparent md:to-purple-500/20 md:opacity-0 md:blur-xl md:transition-all md:duration-500 md:group-hover:translate-y-6 md:group-hover:opacity-100"
            ></div>

            <div
              class="relative flex h-full flex-col rounded-3xl border border-blue-100/60 bg-white p-6 shadow-md transition-all duration-300 md:border-blue-100/80 md:bg-white/90 md:p-8 md:shadow-lg md:shadow-blue-100/50 md:backdrop-blur md:group-hover:-translate-y-2 md:group-hover:border-blue-200 md:group-hover:shadow-2xl md:group-hover:shadow-blue-200"
            >
              <div
                class="mb-6 flex h-12 w-12 items-center justify-center md:mb-8 md:h-14 md:w-14"
              >
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500 text-white shadow-lg shadow-blue-200/60 transition-transform duration-300 md:h-14 md:w-14 md:group-hover:scale-105"
                >
                  <UIcon :name="feature.icon" class="h-6 w-6 md:h-7 md:w-7" />
                </div>
              </div>

              <div class="space-y-3 md:space-y-4">
                <h3 class="text-2xl font-bold text-gray-900">
                  {{ feature.title }}
                </h3>
                <p class="text-base leading-relaxed text-gray-600 md:text-lg">
                  {{ feature.description }}
                </p>
              </div>

              <div
                v-if="feature.highlight"
                class="mt-6 flex items-center gap-2 text-sm font-medium text-blue-600 md:mt-8"
              >
                <span
                  class="inline-flex h-2 w-2 rounded-full bg-blue-500 transition-transform duration-300 md:group-hover:scale-125"
                ></span>
                {{ feature.highlight }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-24 sm:py-32 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center mb-20">
          <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl">
            From invoice to payment in minutes
          </h2>
          <p class="mt-6 text-lg text-gray-600">
            Simple workflow that works on any device, optimized for mobile and
            3G connections.
          </p>
        </div>

        <div class="grid gap-16 lg:grid-cols-3">
          <div class="relative text-center lg:text-left">
            <div class="mb-6 flex justify-center lg:justify-start">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold shadow-lg"
              >
                01
              </div>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Create</h3>
            <p class="text-lg text-gray-600">
              Add client details and line items with smart tax and discount
              calculations. Works perfectly on mobile.
            </p>

            <!-- Connection line -->
            <div
              class="hidden lg:block absolute top-8 left-full w-16 h-px bg-gradient-to-r from-blue-300 to-transparent"
            ></div>
          </div>

          <div class="relative text-center lg:text-left">
            <div class="mb-6 flex justify-center lg:justify-start">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-2xl font-bold shadow-lg"
              >
                02
              </div>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Share</h3>
            <p class="text-lg text-gray-600">
              Send mobile-optimized invoices via WhatsApp, SMS, or email
              instantly. Includes MoMo payment instructions.
            </p>

            <!-- Connection line -->
            <div
              class="hidden lg:block absolute top-8 left-full w-16 h-px bg-gradient-to-r from-indigo-300 to-transparent"
            ></div>
          </div>

          <div class="text-center lg:text-left">
            <div class="mb-6 flex justify-center lg:justify-start">
              <div
                class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white text-2xl font-bold shadow-lg"
              >
                03
              </div>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-4">Get Paid</h3>
            <p class="text-lg text-gray-600">
              Track payments automatically with real-time Mobile Money
              integration and intelligent reminder workflows.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-24 sm:py-32 bg-white">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center mb-20">
          <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p class="mt-6 text-lg text-gray-600">
            Choose the plan that fits your business. All plans include Mobile
            Money integration and WhatsApp support.
          </p>
        </div>

        <div class="grid gap-8 lg:grid-cols-3">
          <div
            v-for="plan in pricingPlans"
            :key="plan.name"
            :class="[
              'relative rounded-3xl p-8 ring-1 ring-gray-200 transition-all hover:ring-gray-300',
              plan.popular
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 ring-blue-200 scale-105'
                : 'bg-white',
            ]"
          >
            <!-- Popular badge -->
            <div
              v-if="plan.popular"
              class="absolute -top-4 left-1/2 transform -translate-x-1/2"
            >
              <span
                class="inline-flex items-center rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white"
              >
                Most popular
              </span>
            </div>

            <div class="text-center">
              <h3 class="text-2xl font-bold text-gray-900">{{ plan.name }}</h3>
              <p class="mt-2 text-sm text-gray-600">{{ plan.description }}</p>

              <div class="mt-6">
                <span class="text-5xl font-bold text-gray-900">{{
                  plan.price
                }}</span>
                <span v-if="plan.period" class="text-lg text-gray-600">{{
                  plan.period
                }}</span>
              </div>

              <UButton
                :to="plan.cta === 'Contact sales' ? '#contact' : '/auth'"
                :class="[
                  'mt-8 w-full font-semibold px-6 py-3 rounded-lg text-base transition-all',
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-900 hover:bg-gray-800 text-white',
                ]"
              >
                {{ plan.cta }}
              </UButton>
            </div>

            <div class="mt-8">
              <ul class="space-y-3">
                <li
                  v-for="feature in plan.features"
                  :key="feature"
                  class="flex items-start gap-3"
                >
                  <svg
                    class="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-sm text-gray-600">{{ feature }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-16 text-center">
          <p class="text-sm text-gray-600">
            All plans include 14-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-24 sm:py-32 bg-gray-50">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <!-- Contact Info -->
          <div>
            <h2 class="text-4xl font-bold text-gray-900 sm:text-5xl">
              Get in touch
            </h2>
            <p class="mt-6 text-lg text-gray-600">
              Have questions about MoMoInvoice? We'd love to hear from you. Send
              us a message and we'll respond as soon as possible.
            </p>

            <div class="mt-12 space-y-8">
              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100"
                >
                  <svg
                    class="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Email us</h3>
                  <p class="mt-1 text-gray-600">hello@momoinvoice.com</p>
                  <p class="mt-1 text-sm text-gray-500">
                    We'll get back to you within 24 hours
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100"
                >
                  <svg
                    class="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Visit us</h3>
                  <p class="mt-1 text-gray-600">Accra, Ghana</p>
                  <p class="mt-1 text-sm text-gray-500">
                    Available for in-person meetings
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100"
                >
                  <svg
                    class="h-6 w-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">WhatsApp</h3>
                  <p class="mt-1 text-gray-600">+233 XX XXX XXXX</p>
                  <p class="mt-1 text-sm text-gray-500">
                    Quick questions and support
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-gray-200">
            <div v-if="contactSubmitted" class="text-center py-8">
              <div
                class="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4"
              >
                <svg
                  class="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">
                Message sent!
              </h3>
              <p class="text-gray-600">
                We'll get back to you within 24 hours.
              </p>
            </div>

            <form v-else @submit.prevent="submitContact" class="space-y-6">
              <div>
                <label
                  for="name"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full name
                </label>
                <input
                  id="name"
                  v-model="contactForm.name"
                  type="text"
                  required
                  placeholder="John Doe"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label
                  for="email"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  v-model="contactForm.email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label
                  for="company"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Company name
                </label>
                <input
                  id="company"
                  v-model="contactForm.company"
                  type="text"
                  placeholder="Your Company Ltd"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label
                  for="message"
                  class="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  v-model="contactForm.message"
                  rows="4"
                  required
                  placeholder="Tell us about your invoicing needs..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                :disabled="contactLoading"
                class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="contactLoading" class="flex items-center">
                  <svg
                    class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
                <span v-else>Send message</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section
      class="py-24 sm:py-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden"
    >
      <!-- Background decoration -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        ></div>
        <div
          class="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        ></div>
      </div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-4xl font-bold text-white sm:text-5xl">
            Ready to get paid faster?
          </h2>
          <p class="mt-6 text-xl text-blue-100">
            Join hundreds of Ghanaian businesses already using MoMoInvoice to
            streamline their invoicing and payments.
          </p>

          <div
            class="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <UButton
              to="/auth"
              size="xl"
              class="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-4 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Start now
            </UButton>
            <UButton
              to="mailto:hello@momoinvoice.com"
              variant="outline"
              size="xl"
              class="border-2 border-white text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-lg text-lg transition-all"
            >
              Contact sales
            </UButton>
          </div>

          <p class="mt-8 text-sm text-blue-200">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-50 py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center text-center">
          <div class="flex items-center gap-3 mb-6">
            <div
              class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-sm font-bold">M</span>
            </div>
            <span class="text-xl font-semibold text-gray-900">MoMoInvoice</span>
          </div>

          <div
            class="flex flex-wrap items-center justify-center gap-8 mb-8 text-sm text-gray-600"
          >
            <a href="#features" class="hover:text-gray-900 transition-colors"
              >Features</a
            >
            <a href="#pricing" class="hover:text-gray-900 transition-colors"
              >Pricing</a
            >
            <a href="#contact" class="hover:text-gray-900 transition-colors"
              >Contact</a
            >
            <a href="/auth" class="hover:text-gray-900 transition-colors"
              >Sign in</a
            >
          </div>

          <p class="text-sm text-gray-500">
            © {{ new Date().getFullYear() }} MoMoInvoice. Proudly crafted in
            Accra, Ghana.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>
