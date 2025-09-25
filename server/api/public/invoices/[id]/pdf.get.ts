import { createError, getRouterParam, setResponseHeader } from "h3";

import { computeInvoiceTotals } from "../../../../utils/invoice";
import { loadInvoicePdfData } from "../../../../utils/invoice-pdf-data";
import { generateInvoicePdf } from "../../../../utils/pdf/generateInvoicePdf";

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, "id");
  if (!invoiceId) {
    throw createError({ statusCode: 400, statusMessage: "Invoice id is required" });
  }

  const data = await loadInvoicePdfData(invoiceId);
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: "Invoice not found" });
  }

  const totalsSummary = computeInvoiceTotals(
    data.invoice.lineItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discount: item.discount,
    })),
  );

  const totals = {
    subtotal: totalsSummary.subtotal,
    taxTotal: totalsSummary.taxTotal,
    discountTotal: totalsSummary.discountTotal,
    grandTotal: totalsSummary.total,
  };

  const config = useRuntimeConfig();
  const appUrl = (config.public.appUrl || "http://localhost:3000").replace(/\/$/, "");
  const paymentLink = `${appUrl}/invoices/${data.invoice.id}`;

  let pdf: Buffer;
  try {
    pdf = await generateInvoicePdf({
      invoice: data.invoice,
      business: data.business,
      client: data.client,
      totals,
      paymentLink,
    });
  } catch (error) {
    console.error("Failed to generate public invoice PDF", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Unable to generate invoice PDF",
    });
  }

  setResponseHeader(event, "Content-Type", "application/pdf");
  setResponseHeader(event, "Content-Disposition", `inline; filename="invoice-${data.invoice.invoiceNumber}.pdf"`);
  setResponseHeader(event, "Cache-Control", "no-store");

  return pdf;
});
