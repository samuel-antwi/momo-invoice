import { computed, watch, watchEffect } from "vue";
import type { ClientContact, CreateClientPayload } from "~/types/models";

export const useClients = () => {
  const clients = useState<ClientContact[]>("clients", () => []);
  const breakdown = useState<Record<string, number>>("clients-breakdown", () => ({}));
  const user = useSupabaseUser();

  const { data, pending, refresh } = useAsyncData(
    "clients",
    () =>
      $fetch<{ clients: ClientContact[]; breakdown: Record<string, number> }>("/api/clients"),
    { server: false },
  );

  watchEffect(() => {
    if (data.value) {
      clients.value = data.value.clients;
      breakdown.value = data.value.breakdown;
    } else if (!user.value) {
      clients.value = [];
      breakdown.value = {};
    }
  });

  watch(
    user,
    (current, previous) => {
      if (current?.id !== previous?.id && current) {
        refresh();
      }
      if (!current) {
        clients.value = [];
        breakdown.value = {};
      }
    },
    { immediate: false },
  );

  const getClientById = (id: string) => clients.value.find((client) => client.id === id);

  const searchClients = computed(() => (term: string) => {
    const query = term.trim().toLowerCase();
    if (!query) return clients.value;
    return clients.value.filter((client) => {
      const fields = [client.fullName, client.businessName ?? "", client.phone ?? "", client.email ?? ""];
      return fields.some((field) => field.toLowerCase().includes(query));
    });
  });

  const clientsByProvider = computed(() => breakdown.value);

  const createClient = async (payload: CreateClientPayload) => {
    const response = await $fetch<{ client: ClientContact }>("/api/clients", {
      method: "POST",
      body: payload,
    });

    if (!response?.client) {
      throw new Error("Failed to create client");
    }

    clients.value = [response.client, ...clients.value];
    breakdown.value = {
      ...breakdown.value,
      [response.client.momoProvider]: (breakdown.value[response.client.momoProvider] ?? 0) + 1,
    };

    await refresh();

    return response.client;
  };

  const updateClient = async (id: string, payload: CreateClientPayload) => {
    const response = await $fetch<{ client: ClientContact }>(`/api/clients/${id}`, {
      method: "PATCH",
      body: payload,
    });

    if (!response?.client) {
      throw new Error("Failed to update client");
    }

    const previous = clients.value.find((client) => client.id === id);
    clients.value = clients.value.map((client) =>
      client.id === id ? response.client : client,
    );

    if (previous && previous.momoProvider !== response.client.momoProvider) {
      const nextBreakdown = { ...breakdown.value };
      const prevCount = (nextBreakdown[previous.momoProvider] ?? 1) - 1;
      nextBreakdown[previous.momoProvider] = Math.max(prevCount, 0);
      nextBreakdown[response.client.momoProvider] =
        (nextBreakdown[response.client.momoProvider] ?? 0) + 1;
      breakdown.value = nextBreakdown;
    }

    await refresh();

    return response.client;
  };

  return {
    clients,
    pending,
    refresh,
    getClientById,
    searchClients,
    clientsByProvider,
    createClient,
    updateClient,
  };
};
