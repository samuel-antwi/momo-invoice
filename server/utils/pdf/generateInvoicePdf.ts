import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

import PdfPrinter from "pdfmake";

import { buildInvoiceDocDefinition, type InvoicePdfTemplateContext } from "./buildInvoiceDocDefinition";
import { loadPdfmakeVfs } from "./resolvePdfmakeFonts";

export interface GenerateInvoicePdfOptions extends InvoicePdfTemplateContext {}

let fontDescriptorsPromise: Promise<Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>> | null = null;

const prepareFonts = async () => {
  if (!fontDescriptorsPromise) {
    fontDescriptorsPromise = (async () => {
      const vfs = await loadPdfmakeVfs();

      const requiredFonts = [
        "Roboto-Regular.ttf",
        "Roboto-Medium.ttf",
        "Roboto-Italic.ttf",
        "Roboto-MediumItalic.ttf",
      ] as const;

      const missing = requiredFonts.filter((name) => !vfs[name]);
      if (missing.length > 0) {
        throw new Error(`Missing fonts in pdfmake bundle: ${missing.join(", ")}`);
      }

      const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pdfmake-fonts-"));

      const writeFont = async (name: (typeof requiredFonts)[number]) => {
        const data = vfs[name];
        const target = path.join(dir, name);
        await fs.writeFile(target, Buffer.from(data, "base64"));
        return target;
      };

      return {
        Roboto: {
          normal: await writeFont("Roboto-Regular.ttf"),
          bold: await writeFont("Roboto-Medium.ttf"),
          italics: await writeFont("Roboto-Italic.ttf"),
          bolditalics: await writeFont("Roboto-MediumItalic.ttf"),
        },
      } as const;
    })();
  }

  return fontDescriptorsPromise;
};

export const generateInvoicePdf = async (options: GenerateInvoicePdfOptions) => {
  const fonts = await prepareFonts();
  const printer = new PdfPrinter(fonts);
  const docDefinition = buildInvoiceDocDefinition(options);
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (chunk) => {
      chunks.push(chunk as Buffer);
    });
    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    pdfDoc.on("error", (error) => {
      reject(error);
    });
    pdfDoc.end();
  });
};
