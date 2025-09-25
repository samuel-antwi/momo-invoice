import type { InvoiceRecord } from "~/types/models";

type InvoiceBusinessDetails = {
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  address?: string;
  logoUrl?: string;
  themeColor?: string;
};

type InvoiceClientDetails = {
  fullName: string;
  businessName?: string;
  email?: string;
  phone?: string;
};

type InvoiceTotals = {
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
};

export interface InvoicePdfTemplateContext {
  invoice: InvoiceRecord;
  business: InvoiceBusinessDetails;
  client: InvoiceClientDetails;
  totals: InvoiceTotals;
  paymentLink?: string;
}

const escapeHtml = (value: string | undefined): string => {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

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

const toSafeUrl = (url?: string) => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, "http://localhost");
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "data:") {
      return url;
    }
  } catch (error) {
    // ignore invalid URLs
  }
  return undefined;
};

const renderNotes = (notes?: string) => {
  if (!notes) return "";
  return notes
    .split(/\r?\n/g)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
};

const darkenColor = (hexColor?: string) => {
  if (!hexColor || !/^#?[0-9a-fA-F]{6}$/.test(hexColor)) return "#0f172a";
  const normalized = hexColor.startsWith("#") ? hexColor.slice(1) : hexColor;
  const r = Math.max(0, Math.min(255, parseInt(normalized.slice(0, 2), 16) - 30));
  const g = Math.max(0, Math.min(255, parseInt(normalized.slice(2, 4), 16) - 30));
  const b = Math.max(0, Math.min(255, parseInt(normalized.slice(4, 6), 16) - 30));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

export const renderInvoiceHtml = ({ invoice, business, client, totals, paymentLink }: InvoicePdfTemplateContext) => {
  const theme = business.themeColor ?? "#f59e0b";
  const themeDark = darkenColor(theme);
  const logoUrl = toSafeUrl(business.logoUrl);
  const currency = invoice.currency ?? "GHS";
  const businessName = escapeHtml(business.name);

  const lineRows = invoice.lineItems
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice, currency)}</td>
          <td>${formatCurrency(item.quantity * item.unitPrice, currency)}</td>
        </tr>
      `,
    )
    .join("");

  const paymentSection = paymentLink
    ? `
      <div class="payment">
        <h2>Pay securely</h2>
        <p>You can complete payment online using our Paystack checkout link.</p>
        <a class="payment-button" href="${escapeHtml(paymentLink)}">Pay invoice</a>
        <p class="payment-url">${escapeHtml(paymentLink)}</p>
      </div>
    `
    : "";

  const notesSection = invoice.notes ? `
      <div class="notes">
        <h3>Notes</h3>
        ${renderNotes(invoice.notes)}
      </div>
    ` : "";

  const billedTo = [
    escapeHtml(client.fullName),
    escapeHtml(client.businessName),
    escapeHtml(client.email),
    escapeHtml(client.phone),
  ]
    .filter(Boolean)
    .join("<br />");

  const businessContact = [
    escapeHtml(business.email),
    escapeHtml(business.phone),
    escapeHtml(business.whatsappNumber),
    escapeHtml(business.address),
  ]
    .filter(Boolean)
    .join("<br />");

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 0;
            color: #0f172a;
            background-color: #f8fafc;
          }
          .wrapper {
            max-width: 760px;
            margin: 0 auto;
            padding: 32px;
            background: white;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            border-bottom: 4px solid ${theme};
            padding-bottom: 24px;
          }
          header .identity {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          header .identity h1 {
            margin: 0;
            font-size: 28px;
            color: ${themeDark};
          }
          header .identity .issuer {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: ${themeDark};
          }
          header .identity p {
            margin: 0;
            color: #475569;
            font-size: 14px;
          }
          header .logo img {
            max-height: 64px;
            max-width: 160px;
            object-fit: contain;
          }
          section {
            margin-bottom: 32px;
          }
          h2 {
            margin: 0 0 12px;
            font-size: 18px;
            color: ${themeDark};
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 14px;
          }
          table thead {
            background-color: ${theme}10;
            color: ${themeDark};
          }
          table th, table td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
          }
          table th:nth-child(2), table th:nth-child(3), table th:nth-child(4),
          table td:nth-child(2), table td:nth-child(3), table td:nth-child(4) {
            text-align: right;
          }
          .summary {
            margin-top: 16px;
            width: 100%;
            border: none;
          }
          .summary tr td {
            padding: 6px 0;
            font-size: 14px;
          }
          .summary tr.total td {
            font-size: 18px;
            font-weight: 600;
            color: ${themeDark};
            padding-top: 12px;
          }
          .totals {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
          }
          .payment {
            border: 1px solid ${theme}50;
            border-radius: 16px;
            padding: 24px;
            background: ${theme}08;
          }
          .payment h2 {
            margin-top: 0;
            font-size: 18px;
          }
          .payment p {
            font-size: 14px;
            color: #475569;
          }
          .payment-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 24px;
            background-color: ${themeDark};
            color: white;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 12px;
          }
          .payment-url {
            margin-top: 12px;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 12px;
            color: #475569;
            word-break: break-all;
          }
          .notes h3 {
            margin: 0 0 8px;
            font-size: 16px;
            color: ${themeDark};
          }
          .notes p {
            margin: 0;
            font-size: 14px;
            color: #475569;
          }
          footer {
            margin-top: 48px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <header>
            <div class="identity">
              <h1>Invoice ${escapeHtml(invoice.invoiceNumber)}</h1>
              ${businessName ? `<p class="issuer">${businessName}</p>` : ""}
              <p>Issued ${formatDate(invoice.issueDate)}${invoice.dueDate ? ` • Due ${formatDate(invoice.dueDate)}` : ""}</p>
              ${businessContact ? `<p>${businessContact}</p>` : ""}
            </div>
            ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="${escapeHtml(business.name)} logo" /></div>` : ""}
          </header>

          <section>
            <h2>Bill To</h2>
            <p>${billedTo || "Client details unavailable"}</p>
          </section>

          <section>
            <h2>Line Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${lineRows}
              </tbody>
            </table>
          </section>

          <section class="totals">
            <table class="summary">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td>${formatCurrency(totals.subtotal, currency)}</td>
                </tr>
                <tr>
                  <td>Taxes</td>
                  <td>${formatCurrency(totals.taxTotal, currency)}</td>
                </tr>
                <tr>
                  <td>Discounts</td>
                  <td>${formatCurrency(totals.discountTotal, currency)}</td>
                </tr>
                <tr class="total">
                  <td>Total Due</td>
                  <td>${formatCurrency(totals.grandTotal, currency)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          ${notesSection}
          ${paymentSection}

          <footer>
            ${escapeHtml(business.name)} • Powered by MoMoInvoice
          </footer>
        </div>
      </body>
    </html>
  `;
};
