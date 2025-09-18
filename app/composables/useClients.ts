import { computed, watch, watchEffect } from "vue";
import type { ClientContact } from "~/types/models";

export const useClients = () => {
  const clients = useState<ClientContact[]>("clients", () => []);
  const breakdown = useState<Record<string, number>>("clients-breakdown", () => ({}));
  const user = useSupabaseUser();

  const { data, pending, refresh } = useAsyncData("clients", () =>
    $fetch<{ clients: ClientContact[]; breakdown: Record<string, number> }>("/api/clients"),
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

  return {
    clients,
    pending,
    refresh,
    getClientById,
    searchClients,
    clientsByProvider,
  };
};
