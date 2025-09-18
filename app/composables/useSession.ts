import { computed, watch } from "vue";
import type { BusinessProfile, ReminderTemplateSetting } from "~/types/models";

const defaultProfile = (): BusinessProfile => ({
  id: "",
  name: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  address: "",
  currency: "GHS",
  themeColor: "#f59e0b",
  plan: "free",
});

export const useSession = () => {
  const profile = useState<BusinessProfile>("session-profile", defaultProfile);
  const reminderTemplates = useState<ReminderTemplateSetting[]>(
    "session-reminder-templates",
    () => [],
  );
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const isPro = computed(() => profile.value.plan === "pro");

  const { data, pending, refresh } = useAsyncData(
    "session-profile",
    async () => {
      if (!user.value) {
        return { profile: null, reminderTemplates: [] };
      }

      return $fetch<{
        profile: BusinessProfile | null;
        reminderTemplates: ReminderTemplateSetting[];
      }>("/api/session");
    },
    { server: false },
  );

  watch(
    () => data.value,
    (value) => {
      if (value?.profile) {
        profile.value = { ...defaultProfile(), ...value.profile };
        reminderTemplates.value = value.reminderTemplates ?? [];
      } else {
        profile.value = defaultProfile();
        reminderTemplates.value = [];
      }
    },
    { immediate: true },
  );

  watch(
    user,
    async (current, previous) => {
      if (current?.id !== previous?.id) {
        if (current) {
          await refresh();
        } else {
          profile.value = defaultProfile();
          reminderTemplates.value = [];
        }
      }
    },
  );

  const updateProfile = async (patch: Partial<BusinessProfile>) => {
    profile.value = { ...profile.value, ...patch };
    if (!user.value) return;

    await $fetch("/api/session", {
      method: "PATCH",
      body: patch,
    });
    await refresh();
  };

  const updateThemeColor = async (color: string) => updateProfile({ themeColor: color });
  const updatePlan = async (plan: BusinessProfile["plan"]) => updateProfile({ plan });

  const logout = async () => {
    await supabase.auth.signOut();
    profile.value = defaultProfile();
    reminderTemplates.value = [];
  };

  return {
    profile,
    reminderTemplates,
    isAuthenticated: computed(() => Boolean(user.value)),
    isPro,
    pending,
    refresh,
    updateThemeColor,
    updatePlan,
    updateProfile,
    logout,
    user,
  };
};
