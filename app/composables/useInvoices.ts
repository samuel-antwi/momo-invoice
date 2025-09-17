import { computed } from "vue";
import { demoData } from "~/utils/demo-data";
import { calculateInvoiceTotals } from "~/utils/invoice-helpers";
import type { DashboardSummary, InvoiceRecord, InvoiceStatus } from "~/types/models";

const cloneInvoices = (items: InvoiceRecord[]): InvoiceRecord[] => items.map((invoice) => ({ ...invoice }));

const daysBetween = (start: Date, end: Date) => Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

const calculateTotals = (invoice: InvoiceRecord) => calculateInvoiceTotals(invoice).grandTotal;

export const useInvoices = () => {
  const invoices = useState<InvoiceRecord[]>("invoices", () => cloneInvoices(demoData.invoices));

  const setStatus = (id: string, status: InvoiceStatus) => {
    invoices.value = invoices.value.map((invoice) => (invoice.id === id ? { ...invoice, status } : invoice));
  };

  const markPaid = (id: string) => {
    invoices.value = invoices.value.map((invoice) =>
      invoice.id === id ? { ...invoice, status: "paid", paidAt: new Date().toISOString() } : invoice,
    );
  };

  const addInvoice = (invoice: InvoiceRecord) => {
    invoices.value = [invoice, ...invoices.value];
  };

  const updateInvoice = (id: string, patch: Partial<InvoiceRecord>) => {
    invoices.value = invoices.value.map((invoice) => (invoice.id === id ? { ...invoice, ...patch } : invoice));
  };

  const removeInvoice = (id: string) => {
    invoices.value = invoices.value.filter((invoice) => invoice.id !== id);
  };

  const summary = computed<DashboardSummary>(() => {
    const now = new Date();
    let totalRevenue = 0;
    let outstanding = 0;
    let overdueTotal = 0;
    let draftCount = 0;
    let sentCount = 0;
    let paidCount = 0;
    let overdueCount = 0;

    invoices.value.forEach((invoice) => {
      const grandTotal = calculateTotals(invoice);
      switch (invoice.status) {
        case "paid":
          paidCount += 1;
          totalRevenue += grandTotal;
          break;
        case "sent":
          sentCount += 1;
          outstanding += grandTotal;
          if (new Date(invoice.dueDate) < now) {
            overdueCount += 1;
            overdueTotal += grandTotal;
          }
          break;
        case "overdue":
          overdueCount += 1;
          overdueTotal += grandTotal;
          outstanding += grandTotal;
          break;
        default:
          draftCount += 1;
      }
    });

    return {
      totalRevenue,
      outstanding,
      overdueTotal,
      draftCount,
      sentCount,
      paidCount,
      overdueCount,
      pendingCount: sentCount + overdueCount,
    };
  });

  const invoicesDueSoon = computed(() => {
    const now = new Date();
    return invoices.value
      .filter((invoice) => invoice.status === "sent")
      .map((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        return {
          ...invoice,
          daysUntilDue: daysBetween(now, dueDate),
        };
      })
      .filter((invoice) => invoice.daysUntilDue >= 0 && invoice.daysUntilDue <= 3)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  });

  const overdueInvoices = computed(() =>
    invoices.value
      .filter((invoice) => invoice.status === "overdue" || new Date(invoice.dueDate) < new Date())
      .map((invoice) => ({
        ...invoice,
        daysOverdue: Math.max(0, daysBetween(new Date(invoice.dueDate), new Date())),
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
  );

  const recentInvoices = computed(() =>
    [...invoices.value]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5),
  );

  return {
    invoices,
    summary,
    overdueInvoices,
    invoicesDueSoon,
    recentInvoices,
    addInvoice,
    updateInvoice,
    removeInvoice,
    setStatus,
    markPaid,
  };
};
