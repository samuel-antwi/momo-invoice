import { renderInvoiceHtml, type InvoicePdfTemplateContext } from "./renderInvoiceHtml";

export interface GenerateInvoicePdfOptions extends InvoicePdfTemplateContext {}

const resolveChromium = async () => {
  try {
    const mod = await import("playwright");
    return mod.chromium;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Cannot find package 'playwright'")) {
      throw new Error(
        "Playwright is not installed. Add it with `npm install -D playwright` (or install the optional dependency) and run `npx playwright install chromium` to enable PDF generation.",
      );
    }
    throw error;
  }
};

export const generateInvoicePdf = async (options: GenerateInvoicePdfOptions) => {
  let browser: { close: () => Promise<void> } | undefined;
  try {
    const chromium = await resolveChromium();
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    const html = renderInvoiceHtml(options);
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
    await page.close();
    return pdf;
  } catch (error) {
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
