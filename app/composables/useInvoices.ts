import { computed, watch, watchEffect } from "vue";
import type { CreateInvoicePayload, DashboardSummary, InvoiceRecord, InvoiceStatus } from "~/types/models";

const defaultSummary = (): DashboardSummary => ({
  totalRevenue: 0,
  outstanding: 0,
  overdueTotal: 0,
  draftCount: 0,
  sentCount: 0,
  paidCount: 0,
  overdueCount: 0,
  unpaidCount: 0,
  pendingCount: 0,
  activeClients: 0,
});

export const useInvoices = () => {
  const invoices = useState<InvoiceRecord[]>("invoices", () => []);
  const summary = useState<DashboardSummary>("invoice-summary", defaultSummary);
  const overdueInvoices = useState<InvoiceRecord[]>("invoice-overdue", () => []);
  const invoicesDueSoon = useState<InvoiceRecord[]>("invoice-due-soon", () => []);
  const recentInvoices = useState<InvoiceRecord[]>("invoice-recent", () => []);
  const user = useSupabaseUser();

  const { data, pending, refresh } = useAsyncData(
    "invoices",
    () =>
      $fetch<{
        invoices: InvoiceRecord[];
        summary: DashboardSummary;
        overdueInvoices: InvoiceRecord[];
        invoicesDueSoon: InvoiceRecord[];
        recentInvoices: InvoiceRecord[];
      }>("/api/invoices"),
    { server: false },
  );

  watchEffect(() => {
    if (data.value) {
      invoices.value = data.value.invoices;
      summary.value = data.value.summary;
      overdueInvoices.value = data.value.overdueInvoices;
      invoicesDueSoon.value = data.value.invoicesDueSoon;
      recentInvoices.value = data.value.recentInvoices;
    } else if (!user.value) {
      invoices.value = [];
      summary.value = defaultSummary();
      overdueInvoices.value = [];
      invoicesDueSoon.value = [];
      recentInvoices.value = [];
    }
  });

  watch(
    user,
    (current, previous) => {
      if (current?.id !== previous?.id && current) {
        refresh();
      }
      if (!current) {
        invoices.value = [];
        summary.value = defaultSummary();
        overdueInvoices.value = [];
        invoicesDueSoon.value = [];
        recentInvoices.value = [];
      }
    },
    { immediate: false },
  );

  const applyInvoicePatch = async (
    id: string,
    patch: { status?: InvoiceStatus; lastSharedAt?: string },
  ) => {
    const previous = [...invoices.value];
    invoices.value = invoices.value.map((invoice) =>
      invoice.id === id ? { ...invoice, ...patch } : invoice,
    );

    try {
      const response = await $fetch<{ invoice: InvoiceRecord }>(`/api/invoices/${id}`, {
        method: "PATCH",
        body: patch,
      });

      if (response?.invoice) {
        invoices.value = invoices.value.map((invoice) =>
          invoice.id === id ? response.invoice : invoice,
        );
      }
    } catch (error) {
      invoices.value = previous;
      throw error;
    }
  };

  const setStatus = async (id: string, status: InvoiceStatus) => {
    await applyInvoicePatch(id, { status });
  };

  const markShared = async (id: string) => {
    const invoice = invoices.value.find((item) => item.id === id);
    if (!invoice) return;

    const patch: { status?: InvoiceStatus; lastSharedAt: string } = {
      lastSharedAt: new Date().toISOString(),
    };

    if (invoice.status === "draft") {
      patch.status = "sent";
    }

    await applyInvoicePatch(id, patch);
  };

  const markPaid = (id: string) => {
    invoices.value = invoices.value.map((invoice) =>
      invoice.id === id ? { ...invoice, status: "paid", paidAt: new Date().toISOString() } : invoice,
    );
  };

  const addInvoice = (invoice: InvoiceRecord) => {
    invoices.value = [invoice, ...invoices.value];
  };

  const updateInvoice = (updated: InvoiceRecord) => {
    invoices.value = invoices.value.map((invoice) => (invoice.id === updated.id ? updated : invoice));
  };

  const removeInvoice = (id: string) => {
    invoices.value = invoices.value.filter((invoice) => invoice.id !== id);
  };

  const createInvoice = async (payload: CreateInvoicePayload) => {
    const response = await $fetch<{ invoice: InvoiceRecord }>("/api/invoices", {
      method: "POST",
      body: payload,
    });

    if (!response?.invoice) {
      throw new Error("Failed to create invoice");
    }

    addInvoice(response.invoice);
    await refresh();

    return response.invoice;
  };

  type EditInvoicePayload = {
    status?: InvoiceStatus;
    lastSharedAt?: string;
    clientId?: string;
    issueDate?: string;
    dueDate?: string | null;
    currency?: string;
    paymentMethodId?: string | null;
    notes?: string | null;
    paymentInstructions?: string | null;
    payableTo?: string | null;
    lineItems?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }>;
  };

  const editInvoice = async (id: string, payload: EditInvoicePayload) => {
    const response = await $fetch<{ invoice: InvoiceRecord }>(`/api/invoices/${id}`, {
      method: "PATCH",
      body: payload,
    });

    if (!response?.invoice) {
      throw new Error("Failed to update invoice");
    }

    updateInvoice(response.invoice);
    await refresh();

    return response.invoice;
  };

  return {
    invoices,
    summary: computed(() => summary.value),
    overdueInvoices: computed(() => overdueInvoices.value),
    invoicesDueSoon: computed(() => invoicesDueSoon.value),
    recentInvoices: computed(() => recentInvoices.value),
    pending,
    refresh,
    addInvoice,
    updateInvoice,
    removeInvoice,
    setStatus,
    markPaid,
    markShared,
    createInvoice,
    editInvoice,
  };
};
