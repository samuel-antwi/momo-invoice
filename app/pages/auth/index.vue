<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSession } from "~/composables/useSession";

definePageMeta({ layout: "plain" });

const router = useRouter();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { refresh } = useSession();

const mode = ref<"signin" | "signup">("signin");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const message = ref("");

watch(
  user,
  (value) => {
    if (value) {
      router.replace("/app/dashboard");
    }
  },
  { immediate: true }
);

const toggleMode = () => {
  mode.value = mode.value === "signin" ? "signup" : "signin";
  message.value = "";
  email.value = "";
  password.value = "";
  confirmPassword.value = "";
};

const submit = async () => {
  if (!email.value || !password.value) {
    message.value = "Email and password are required.";
    return;
  }

  if (mode.value === "signup" && password.value !== confirmPassword.value) {
    message.value = "Passwords do not match.";
    return;
  }

  if (mode.value === "signup" && password.value.length < 8) {
    message.value = "Password must be at least 8 characters.";
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    if (mode.value === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
      if (error) {
        message.value = error.message;
        return;
      }
      await refresh();
      const redirectTo =
        router.currentRoute.value.query.redirect ?? "/app/dashboard";
      router.replace(redirectTo as string);
    } else {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });
      if (error) {
        message.value = error.message;
        return;
      }
      message.value =
        "Check your email to confirm your account and complete signup.";
    }
  } catch (error: any) {
    message.value = error?.message ?? "Something went wrong. Please try again.";
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <NuxtLink to="/" class="flex items-center gap-3">
            <div
              class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center"
            >
              <span class="text-white text-sm font-bold">M</span>
            </div>
            <span class="text-xl font-semibold text-gray-900">MoMoInvoice</span>
          </NuxtLink>
          <NuxtLink
            to="/"
            class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to home
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div
      class="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="w-full max-w-sm">
        <!-- Auth Form -->
        <div class="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">
              {{ mode === "signin" ? "Welcome back" : "Create your account" }}
            </h1>
            <p class="text-sm text-gray-600">
              {{
                mode === "signin"
                  ? "Sign in to your MoMoInvoice workspace"
                  : "Start managing your invoices today"
              }}
            </p>
          </div>

          <!-- Alert Message -->
          <div v-if="message" class="mb-6">
            <div
              :class="[
                'rounded-lg p-4 text-sm',
                message.includes('Check your email') ||
                message.includes('confirm')
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-red-50 text-red-800 border border-red-200',
              ]"
            >
              {{ message }}
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="submit" class="space-y-5">
            <!-- Email -->
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="you@company.com"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <!-- Password -->
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="••••••••••••"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <!-- Confirm Password (Signup only) -->
            <div v-if="mode === 'signup'">
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                placeholder="••••••••••••"
                class="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span v-if="loading" class="flex items-center">
                <svg
                  class="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                {{
                  mode === "signin" ? "Signing in..." : "Creating account..."
                }}
              </span>
              <span v-else>
                {{ mode === "signin" ? "Sign in" : "Create account" }}
              </span>
            </button>
          </form>

          <!-- Toggle Mode -->
          <div class="mt-6 text-center">
            <button
              @click="toggleMode"
              class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {{
                mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"
              }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
