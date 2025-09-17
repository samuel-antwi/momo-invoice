import { useSession } from "~/composables/useSession";

export default defineNuxtRouteMiddleware((to) => {
  const session = useSession();
  const isAuthenticated = session.isAuthenticated.value;

  if (!isAuthenticated && to.path.startsWith("/app")) {
    return navigateTo("/auth");
  }

  if (isAuthenticated && to.path === "/") {
    return navigateTo("/app/dashboard");
  }
});
