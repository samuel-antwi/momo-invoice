<script setup lang="ts">
definePageMeta({ layout: "plain" });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-white via-amber-50/40 to-white">
    <header class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:py-16 lg:flex-row lg:items-center lg:gap-14">
      <div class="flex-1 space-y-6">
        <p class="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Built for Ghanaian SMEs
        </p>
        <h1 class="text-4xl font-semibold text-slate-900 sm:text-5xl">
          Send invoices in minutes.<br class="hidden sm:block" />Get paid via MoMo instantly.
        </h1>
        <p class="max-w-xl text-lg text-slate-600">
          MoMoInvoice is a mobile-first invoicing platform tailored for traders, freelancers, and small businesses in Ghana.
          Create branded invoices, share via WhatsApp, and track payments without spreadsheets or guesswork.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <UButton color="primary" size="xl" to="/auth">Start free trial</UButton>
          <UButton color="gray" variant="ghost" size="xl" to="/auth">View demo workspace</UButton>
        </div>
        <div class="flex items-center gap-4 text-sm text-slate-500">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">β</span>
            Pilot cohort open now
          </div>
          <div>£500/mo target | No card required</div>
        </div>
      </div>
      <div class="flex-1">
        <div class="relative mx-auto max-w-lg rounded-[32px] border border-amber-100 bg-white/80 p-6 shadow-xl shadow-amber-100/60">
          <p class="text-sm font-semibold text-amber-700">Mobile preview</p>
          <div class="mt-4 space-y-3 text-sm">
            <div class="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p class="font-semibold text-slate-900">Invoice #GNB-2024-003</p>
              <p class="text-slate-500">Due in 2 days • GH₵ 680.00</p>
              <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>WhatsApp ready</span>
                <span class="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">MoMo Collect</span>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p class="text-slate-500">Ama Boateng paid GH₵ 560.00 via MTN MoMo</p>
              <p class="text-xs text-emerald-600">Payment auto-logged 5 mins ago</p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <p class="font-semibold text-slate-900">Automated reminders</p>
              <ul class="mt-2 space-y-1 text-xs text-slate-500">
                <li>• 3-day pre-due WhatsApp nudge</li>
                <li>• Day-of SMS reminder via Africa's Talking</li>
                <li>• 2-day overdue email with payment link</li>
              </ul>
            </div>
          </div>
          <div class="absolute -left-10 bottom-6 hidden rounded-2xl bg-white/90 p-4 shadow-lg shadow-amber-200/40 sm:block">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard snapshot</p>
            <p class="text-2xl font-semibold text-slate-900">GH₵ 12,480</p>
            <p class="text-xs text-slate-500">in paid invoices this month</p>
          </div>
        </div>
      </div>
    </header>

    <main class="bg-white">
      <section class="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-14">
        <div class="text-center">
          <h2 class="text-3xl font-semibold text-slate-900">Why MoMoInvoice</h2>
          <p class="mt-3 text-lg text-slate-600">
            Everything you need to run your business from your phone—no desktop dashboards, no complex accounting.
          </p>
        </div>
        <div class="grid gap-6 md:grid-cols-2">
          <UCard class="border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-100" :ui="{ body: 'space-y-3 p-6' }">
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-amber-100 p-2 text-amber-700">🧾</span>
              <h3 class="text-lg font-semibold text-slate-900">Branded invoices in 60 seconds</h3>
            </div>
            <p class="text-sm text-slate-600">
              Capture clients, line items, and payment instructions in a clean mobile editor. Preview instantly before sending.
            </p>
          </UCard>
          <UCard class="border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-100" :ui="{ body: 'space-y-3 p-6' }">
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-emerald-100 p-2 text-emerald-700">💸</span>
              <h3 class="text-lg font-semibold text-slate-900">MoMo-first payments</h3>
            </div>
            <p class="text-sm text-slate-600">
              Collect via MTN, Vodafone, or AirtelTigo MoMo. Payment confirmations auto-update invoice status (coming with Supabase).
            </p>
          </UCard>
          <UCard class="border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-100" :ui="{ body: 'space-y-3 p-6' }">
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-blue-100 p-2 text-blue-700">📲</span>
              <h3 class="text-lg font-semibold text-slate-900">WhatsApp, SMS & Email delivery</h3>
            </div>
            <p class="text-sm text-slate-600">
              One-tap sharing with prefilled templates in Twi/English. Never copy-paste amounts again.
            </p>
          </UCard>
          <UCard class="border border-slate-200/80 bg-white/85 shadow-sm shadow-slate-100" :ui="{ body: 'space-y-3 p-6' }">
            <div class="flex items-center gap-3">
              <span class="rounded-full bg-slate-100 p-2 text-slate-700">⏰</span>
              <h3 class="text-lg font-semibold text-slate-900">Automated reminders</h3>
            </div>
            <p class="text-sm text-slate-600">
              Configure friendly nudges for due & overdue invoices. SMS via Africa’s Talking once backend goes live.
            </p>
          </UCard>
        </div>
      </section>

      <section class="bg-slate-900">
        <div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-amber-400">Pricing</p>
            <h3 class="mt-2 text-3xl font-semibold text-white">Start free, grow into Pro</h3>
            <p class="mt-3 max-w-lg text-slate-300">
              Free tier keeps 5 invoices per month with WhatsApp sharing. Pro unlocks unlimited invoices, reminder automation,
              and priority support.
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UCard :ui="{ body: 'space-y-3 p-6' }" class="bg-white/5 text-white shadow-none backdrop-blur">
              <p class="text-sm uppercase tracking-wide text-amber-300">Free</p>
              <p class="text-3xl font-semibold">GH₵ 0</p>
              <ul class="space-y-2 text-sm text-slate-200">
                <li>• 5 invoices / month</li>
                <li>• WhatsApp / SMS share</li>
                <li>• Manual MoMo confirmation</li>
              </ul>
            </UCard>
            <UCard :ui="{ body: 'space-y-3 p-6' }" class="border border-amber-400/60 bg-amber-100/10 text-white backdrop-blur">
              <p class="text-sm uppercase tracking-wide text-amber-300">Pro</p>
              <p class="text-3xl font-semibold">GH₵ 89</p>
              <ul class="space-y-2 text-sm text-slate-100">
                <li>• Unlimited invoices</li>
                <li>• Automated reminders</li>
                <li>• Real-time MoMo status (coming soon)</li>
              </ul>
            </UCard>
          </div>
        </div>
      </section>

      <section class="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-16 text-center">
        <h3 class="text-3xl font-semibold text-slate-900">Ready to invoice like a pro?</h3>
        <p class="text-lg text-slate-600">
          Join the pilot, give feedback, and help shape the invoicing platform built for Ghana.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <UButton color="primary" size="xl" to="/auth">Get started</UButton>
          <UButton color="gray" variant="ghost" size="xl" to="mailto:hello@momoinvoice.com">Talk to us</UButton>
        </div>
      </section>
    </main>

    <footer class="bg-white/80 py-8 text-center text-sm text-slate-500">
      © {{ new Date().getFullYear() }} MoMoInvoice • Built in Ghana for Ghanaian businesses.
    </footer>
  </div>
</template>
