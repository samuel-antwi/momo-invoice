import { computed } from "vue";
import { demoData } from "~/utils/demo-data";
import type { ClientContact } from "~/types/models";

const cloneClients = (clients: ClientContact[]): ClientContact[] => clients.map((client) => ({ ...client }));

export const useClients = () => {
  const clients = useState<ClientContact[]>("clients", () => cloneClients(demoData.clients));

  const getClientById = (id: string) => clients.value.find((client) => client.id === id);

  const addClient = (payload: ClientContact) => {
    clients.value = [...clients.value, payload];
  };

  const updateClient = (id: string, patch: Partial<ClientContact>) => {
    clients.value = clients.value.map((client) => (client.id === id ? { ...client, ...patch } : client));
  };

  const removeClient = (id: string) => {
    clients.value = clients.value.filter((client) => client.id !== id);
  };

  const searchClients = computed(() => (term: string) => {
    const query = term.trim().toLowerCase();
    if (!query) return clients.value;
    return clients.value.filter((client) => {
      const fields = [client.fullName, client.businessName ?? "", client.phone ?? "", client.email ?? ""];
      return fields.some((field) => field.toLowerCase().includes(query));
    });
  });

  const clientsByProvider = computed(() => {
    return clients.value.reduce<Record<string, number>>((acc, client) => {
      acc[client.momoProvider] = (acc[client.momoProvider] ?? 0) + 1;
      return acc;
    }, {});
  });

  return {
    clients,
    addClient,
    updateClient,
    removeClient,
    getClientById,
    searchClients,
    clientsByProvider,
  };
};
