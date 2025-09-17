import { computed } from "vue";
import { demoData } from "~/utils/demo-data";
import type { BusinessProfile } from "~/types/models";

const cloneProfile = (profile: BusinessProfile): BusinessProfile => ({ ...profile });

export const useSession = () => {
  const profile = useState<BusinessProfile>("session-profile", () => cloneProfile(demoData.businessProfile));
  const isAuthenticated = useState<boolean>("session-auth", () => false);
  const isPro = computed(() => profile.value.plan === "pro");

  const updateThemeColor = (color: string) => {
    profile.value.themeColor = color;
  };

  const updatePlan = (plan: BusinessProfile["plan"]) => {
    profile.value.plan = plan;
  };

  const updateProfile = (patch: Partial<BusinessProfile>) => {
    profile.value = { ...profile.value, ...patch };
  };

  const login = (patch?: Partial<BusinessProfile>) => {
    if (patch) {
      updateProfile(patch);
    }
    isAuthenticated.value = true;
  };

  const logout = () => {
    isAuthenticated.value = false;
  };

  return {
    profile,
    isAuthenticated,
    isPro,
    updateThemeColor,
    updatePlan,
    updateProfile,
    login,
    logout,
  };
};
