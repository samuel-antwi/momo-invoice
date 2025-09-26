import { Resend } from "resend";

let resend: Resend | null = null;

// Initialize Resend client
function getResendClient() {
  if (!resend) {
    const config = useRuntimeConfig();

    // Use Resend API key from runtime config
    const apiKey = config.resendApiKey;
    if (!apiKey || apiKey === "re_123456789") {
      console.warn("Warning: Resend API key not configured. Emails will not be sent.");
    }
    resend = new Resend(apiKey || "re_123456789");
  }
  return resend;
}

export async function sendReminderEmail(invoice: any, template: any, test = false) {
  const config = useRuntimeConfig();
  const appUrl = config.public.appUrl || "http://localhost:3000";

  const invoiceUrl = `${appUrl}/i/${invoice.id}`;
  const daysText = template.offsetDays === 0
    ? "is due today"
    : template.offsetDays < 0
      ? `is due in ${Math.abs(template.offsetDays)} day${Math.abs(template.offsetDays) !== 1 ? 's' : ''}`
      : `is ${template.offsetDays} day${template.offsetDays !== 1 ? 's' : ''} overdue`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Reminder</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }
        .header {
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          color: white;
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 600;
        }
        .header p {
          margin: 8px 0 0;
          opacity: 0.95;
          font-size: 16px;
        }
        .content {
          padding: 32px;
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 16px;
        }
        .invoice-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .invoice-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .invoice-row:last-child {
          border-bottom: none;
          padding-top: 12px;
          font-size: 18px;
          font-weight: 600;
        }
        .invoice-label {
          color: #6b7280;
          font-size: 14px;
        }
        .invoice-value {
          color: #111827;
          font-weight: 500;
        }
        .amount {
          color: #ea580c;
          font-size: 20px;
        }
        .cta-button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px auto;
          display: block;
          text-align: center;
          max-width: 260px;
        }
        .payment-methods {
          background: #fffbeb;
          border: 1px solid #fbbf24;
          border-radius: 8px;
          padding: 16px;
          margin: 24px 0;
        }
        .payment-methods h3 {
          margin: 0 0 12px;
          font-size: 14px;
          color: #92400e;
          font-weight: 600;
        }
        .payment-methods ul {
          margin: 0;
          padding: 0 0 0 20px;
          color: #78350f;
          font-size: 14px;
        }
        .payment-methods li {
          margin: 6px 0;
        }
        .footer {
          padding: 24px 32px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 13px;
          color: #6b7280;
        }
        .footer a {
          color: #ea580c;
          text-decoration: none;
        }
        .test-banner {
          background: #dbeafe;
          color: #1e40af;
          padding: 12px;
          text-align: center;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 2px solid #60a5fa;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${test ? '<div class="test-banner">🧪 TEST MODE - This is a test email</div>' : ''}

        <div class="header">
          <h1>${template.label}</h1>
          <p>From ${invoice.business.name}</p>
        </div>

        <div class="content">
          <div class="greeting">Hello ${invoice.client?.fullName || 'Valued Customer'},</div>

          <p>This is a friendly reminder that your invoice <strong>#${invoice.invoiceNumber}</strong> ${daysText}.</p>

          <div class="invoice-card">
            <div class="invoice-row">
              <span class="invoice-label">Invoice Number</span>
              <span class="invoice-value">#${invoice.invoiceNumber}</span>
            </div>
            <div class="invoice-row">
              <span class="invoice-label">Due Date</span>
              <span class="invoice-value">${new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</span>
            </div>
            <div class="invoice-row">
              <span class="invoice-label">Status</span>
              <span class="invoice-value" style="color: ${template.offsetDays > 0 ? '#dc2626' : '#ea580c'};">
                ${template.offsetDays > 0 ? 'OVERDUE' : template.offsetDays === 0 ? 'DUE TODAY' : 'DUE SOON'}
              </span>
            </div>
            <div class="invoice-row">
              <span class="invoice-label">Amount Due</span>
              <span class="amount">GH₵ ${invoice.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <a href="${invoiceUrl}" class="cta-button">View & Pay Invoice →</a>

          <div class="payment-methods">
            <h3>🎯 Quick Payment Options Available:</h3>
            <ul>
              <li><strong>Mobile Money</strong> - MTN, Vodafone, AirtelTigo</li>
              <li><strong>Card Payment</strong> - Visa, Mastercard</li>
              <li><strong>Bank Transfer</strong> - Direct deposit</li>
            </ul>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            If you've already made payment or have any questions, please don't hesitate to contact us.
          </p>

          <p style="margin-top: 24px;">
            Thank you for your business!<br>
            <strong>${invoice.business.name}</strong>
          </p>
        </div>

        <div class="footer">
          <p style="margin: 0 0 8px;">
            ${invoice.business.email ? `📧 ${invoice.business.email}` : ''}
            ${invoice.business.phone ? ` | 📱 ${invoice.business.phone}` : ''}
          </p>
          <p style="margin: 8px 0;">
            Powered by <a href="https://momoinvoice.com">MoMoInvoice</a> - Professional invoicing for Ghana
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const fromEmail = config.emailFromAddress || "info@kaygia.com";
  const fromName = config.emailFromName || "Momo Invoice";

  const emailData = {
    from: `${fromName} <${fromEmail}>`,
    to: invoice.client.email,
    subject: `${template.offsetDays > 0 ? '⚠️ OVERDUE: ' : ''}Payment Reminder - Invoice #${invoice.invoiceNumber}`,
    html: emailHtml,
    reply_to: invoice.business.email || undefined,
    tags: [
      {
        name: "category",
        value: "payment-reminder",
      },
      {
        name: "invoice-id",
        value: invoice.id,
      },
    ],
  };

  if (test) {
    console.log("Test mode: Email would be sent to", invoice.client.email);
    console.log("Subject:", emailData.subject);
    return {
      success: true,
      test: true,
      preview: {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from,
      }
    };
  }

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send(emailData);

    if (error) {
      console.error("Resend error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    console.log("Email sent successfully via Resend:", data?.id);
    return {
      success: true,
      messageId: data?.id,
      provider: "resend"
    };
  } catch (error: any) {
    console.error("Email send error:", error);
    throw error;
  }
}

// Export additional email functions for other notifications
export async function sendInvoiceEmail(invoice: any, test = false) {
  const config = useRuntimeConfig();
  const appUrl = config.public.appUrl || "http://localhost:3000";
  const invoiceUrl = `${appUrl}/i/${invoice.id}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Invoice</title>
      <style>
        /* Same styles as above */
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Invoice</h1>
          <p>From ${invoice.business.name}</p>
        </div>
        <div class="content">
          <p>Hello ${invoice.client?.fullName || 'Valued Customer'},</p>
          <p>You have received a new invoice #${invoice.invoiceNumber}.</p>
          <a href="${invoiceUrl}" class="cta-button">View Invoice →</a>
        </div>
      </div>
    </body>
    </html>
  `;

  const fromEmail = config.emailFromAddress || "info@kaygia.com";
  const fromName = config.emailFromName || "Momo Invoice";

  const emailData = {
    from: `${fromName} <${fromEmail}>`,
    to: invoice.client.email,
    subject: `New Invoice #${invoice.invoiceNumber} from ${invoice.business.name}`,
    html: emailHtml,
    reply_to: invoice.business.email || undefined,
  };

  if (test) {
    return { success: true, test: true, preview: emailData };
  }

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send(emailData);

    if (error) {
      throw new Error(error.message || "Failed to send email");
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}