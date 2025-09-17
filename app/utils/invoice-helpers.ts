import type { InvoiceLineItem, InvoiceRecord } from "~/types/models";

const calculateLineItemTotal = (item: InvoiceLineItem) => {
  const base = item.quantity * item.unitPrice;
  const tax = item.taxRate ? base * item.taxRate : 0;
  const discount = item.discount ?? 0;
  return base + tax - discount;
};

export const calculateInvoiceTotals = (invoice: InvoiceRecord) => {
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxTotal = invoice.lineItems.reduce(
    (sum, item) => sum + (item.taxRate ? item.quantity * item.unitPrice * item.taxRate : 0),
    0,
  );
  const discountTotal = invoice.lineItems.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const grandTotal = invoice.lineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);

  return {
    subtotal,
    taxTotal,
    discountTotal,
    grandTotal,
  };
};

export const formatCurrency = (amount: number, currency = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount);

export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
