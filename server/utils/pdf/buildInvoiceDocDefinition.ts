import type { TDocumentDefinitions, ContentTable } from "pdfmake/interfaces";

import type { InvoiceRecord } from "~/types/models";

export interface InvoicePdfTemplateContext {
  invoice: InvoiceRecord;
  business: {
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    address?: string;
    logoUrl?: string;
    themeColor?: string;
  };
  client: {
    fullName: string;
    businessName?: string;
    email?: string;
    phone?: string;
  };
  totals: {
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
  };
  paymentLink?: string;
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

const formatDate = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const buildLineItemsTable = (
  invoice: InvoiceRecord,
  currency: string,
): ContentTable => {
  const body = [
    [
      { text: "Description", style: "tableHeader" },
      { text: "Qty", style: "tableHeader", alignment: "right" },
      { text: "Unit price", style: "tableHeader", alignment: "right" },
      { text: "Total", style: "tableHeader", alignment: "right" },
    ],
    ...invoice.lineItems.map((item) => [
      { text: item.description, style: "tableCell" },
      { text: item.quantity.toString(), style: "tableCell", alignment: "right" },
      { text: formatCurrency(item.unitPrice, currency), style: "tableCell", alignment: "right" },
      {
        text: formatCurrency(item.quantity * item.unitPrice, currency),
        style: "tableCell",
        alignment: "right",
      },
    ]),
  ];

  return {
    widths: ["*", "auto", "auto", "auto"],
    body,
    layout: "lightHorizontalLines",
  };
};

export const buildInvoiceDocDefinition = ({
  invoice,
  business,
  client,
  totals,
  paymentLink,
}: InvoicePdfTemplateContext): TDocumentDefinitions => {
  const currency = invoice.currency ?? "GHS";
  const issued = formatDate(invoice.issueDate);
  const due = formatDate(invoice.dueDate);
  const billedToLines = [client.fullName, client.businessName, client.email, client.phone].filter(Boolean);
  const businessContact = [business.email, business.phone, business.whatsappNumber, business.address].filter(
    Boolean,
  );

  return {
    info: {
      title: `Invoice ${invoice.invoiceNumber}`,
    },
    content: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `Invoice ${invoice.invoiceNumber}`, style: "title" },
              {
                text: due ? `Issued ${issued} • Due ${due}` : `Issued ${issued}`,
                style: "subtitle",
              },
              businessContact.length
                ? { text: businessContact.join(" \u2022 "), style: "muted" }
                : undefined,
            ].filter(Boolean),
          },
          {
            width: "auto",
            stack: [
              { text: business.name, style: "issuer", alignment: "right" },
            ],
          },
        ],
      },
      { text: "\n" },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Bill to", style: "sectionHeading" },
              { text: billedToLines.join("\n") || "Client details unavailable", style: "body" },
            ],
          },
          {
            width: "auto",
            stack: [
              { text: "Amount due", style: "sectionHeading", alignment: "right" },
              {
                text: formatCurrency(totals.grandTotal, currency),
                style: "amount",
                alignment: "right",
              },
            ],
          },
        ],
      },
      { text: "\n" },
      {
        text: "Line items",
        style: "sectionHeading",
      },
      {
        style: "tableWrapper",
        table: buildLineItemsTable(invoice, currency),
      },
      {
        columns: [
          { width: "*", text: "" },
          {
            width: "auto",
            table: {
              widths: ["auto", "auto"],
              body: [
                [
                  { text: "Subtotal", style: "tableCell" },
                  { text: formatCurrency(totals.subtotal, currency), style: "tableCell", alignment: "right" },
                ],
                [
                  { text: "Taxes", style: "tableCell" },
                  { text: formatCurrency(totals.taxTotal, currency), style: "tableCell", alignment: "right" },
                ],
                [
                  { text: "Discounts", style: "tableCell" },
                  { text: formatCurrency(totals.discountTotal, currency), style: "tableCell", alignment: "right" },
                ],
                [
                  { text: "Total due", style: "tableTotalLabel" },
                  { text: formatCurrency(totals.grandTotal, currency), style: "tableTotalValue", alignment: "right" },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingTop: () => 4,
              paddingBottom: () => 4,
            },
          },
        ],
      },
      invoice.notes
        ? {
            margin: [0, 20, 0, 0],
            stack: [
              { text: "Notes", style: "sectionHeading" },
              { text: invoice.notes, style: "body" },
            ],
          }
        : undefined,
      paymentLink
        ? {
            margin: [0, 20, 0, 0],
            stack: [
              { text: "Pay securely via Paystack", style: "sectionHeading" },
              {
                text:
                  "Use the button or the link below to complete payment online via mobile money or card. The invoice will update automatically once the payment is confirmed.",
                style: "muted",
              },
              {
                margin: [0, 12, 0, 0],
                table: {
                  widths: ["*"],
                  body: [
                    [
                      {
                        text: "Pay invoice",
                        style: "button",
                        alignment: "center",
                        link: paymentLink,
                      },
                    ],
                    [
                      {
                        text: paymentLink,
                        style: "link",
                        alignment: "center",
                        link: paymentLink,
                      },
                    ],
                  ],
                },
                layout: {
                  hLineWidth: () => 0,
                  vLineWidth: () => 0,
                  paddingTop: (i: number) => (i === 0 ? 12 : 6),
                  paddingBottom: (i: number) => (i === 1 ? 12 : 6),
                },
              },
            ],
          }
        : undefined,
    ].filter(Boolean) as NonNullable<TDocumentDefinitions["content"]>,
    styles: {
      title: {
        fontSize: 24,
        bold: true,
        color: "#0f172a",
      },
      issuer: {
        fontSize: 16,
        bold: true,
        color: "#334155",
      },
      subtitle: {
        fontSize: 14,
        color: "#475569",
        margin: [0, 4, 0, 0],
      },
      muted: {
        fontSize: 12,
        color: "#94a3b8",
      },
      sectionHeading: {
        fontSize: 14,
        bold: true,
        color: "#1e293b",
        margin: [0, 12, 0, 6],
      },
      body: {
        fontSize: 13,
        color: "#1e293b",
      },
      amount: {
        fontSize: 22,
        bold: true,
        color: "#0f172a",
      },
      tableHeader: {
        fontSize: 12,
        bold: true,
        fillColor: "#f8fafc",
        color: "#0f172a",
        margin: [0, 4, 0, 4],
      },
      tableCell: {
        fontSize: 12,
        color: "#1e293b",
      },
      tableTotalLabel: {
        fontSize: 13,
        bold: true,
        color: "#0f172a",
        margin: [0, 4, 0, 0],
      },
      tableTotalValue: {
        fontSize: 14,
        bold: true,
        color: "#0f172a",
        margin: [0, 4, 0, 0],
      },
      tableWrapper: {
        margin: [0, 8, 0, 8],
      },
      button: {
        fontSize: 14,
        bold: true,
        color: "#ffffff",
        fillColor: "#0f172a",
        margin: [0, 8, 0, 8],
        borderRadius: 4,
      },
      link: {
        fontSize: 12,
        color: "#2563eb",
        margin: [0, 4, 0, 0],
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };
};
