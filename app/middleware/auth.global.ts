import { useSession } from "~/composables/useSession";

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const supabase = useSupabaseClient();

  if (!user.value) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      user.value = data.session.user;
    }
  }

  if (to.path.startsWith("/app")) {
    if (!user.value) {
      return navigateTo({ path: "/auth", query: { redirect: to.fullPath } });
    }

    if (process.client) {
      const { profile, refresh } = useSession();
      if (!profile.value.id) {
        await refresh();
      }

      const requiresSetup = Boolean(profile.value.id && !profile.value.setupCompleted);
      const setupPath = "/app/setup";

      if (requiresSetup && to.path !== setupPath) {
        return navigateTo(setupPath);
      }

      if (!requiresSetup && to.path === setupPath) {
        return navigateTo("/app/dashboard");
      }
    }
  }
});
