import { computed, watch, watchEffect } from "vue";
import type { CreatePaymentMethodPayload, PaymentMethod } from "~/types/models";

export const usePaymentMethods = () => {
  const paymentMethods = useState<PaymentMethod[]>("payment-methods", () => []);
  const defaultMethodId = useState<string | null>("payment-methods-default", () => null);
  const user = useSupabaseUser();

  const { data, pending, refresh } = useAsyncData(
    "payment-methods",
    () =>
      $fetch<{ paymentMethods: PaymentMethod[]; defaultMethodId: string | null }>("/api/payment-methods"),
    { server: false },
  );

  watchEffect(() => {
    if (data.value) {
      paymentMethods.value = data.value.paymentMethods;
      defaultMethodId.value = data.value.defaultMethodId;
    } else if (!user.value) {
      paymentMethods.value = [];
      defaultMethodId.value = null;
    }
  });

  watch(
    user,
    (current, previous) => {
      if (current?.id !== previous?.id && current) {
        refresh();
      }
      if (!current) {
        paymentMethods.value = [];
        defaultMethodId.value = null;
      }
    },
    { immediate: false },
  );

  const getPaymentMethodById = (id: string) => paymentMethods.value.find((method) => method.id === id);

  const defaultMethod = computed(() => {
    if (defaultMethodId.value) {
      return paymentMethods.value.find((method) => method.id === defaultMethodId.value) ?? null;
    }
    return paymentMethods.value[0] ?? null;
  });

  const createPaymentMethod = async (payload: CreatePaymentMethodPayload) => {
    const response = await $fetch<{ paymentMethod: PaymentMethod; defaultMethodId: string | null }>("/api/payment-methods", {
      method: "POST",
      body: payload,
    });

    if (!response?.paymentMethod) {
      throw new Error("Failed to create payment method");
    }

    paymentMethods.value = [response.paymentMethod, ...paymentMethods.value.filter((method) => method.id !== response.paymentMethod.id)];
    defaultMethodId.value = response.defaultMethodId;

    await refresh();

    return response.paymentMethod;
  };

  return {
    paymentMethods,
    defaultMethod,
    defaultMethodId,
    pending,
    refresh,
    getPaymentMethodById,
    createPaymentMethod,
  };
};
