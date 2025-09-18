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
  }
});
