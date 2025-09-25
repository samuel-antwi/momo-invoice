import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// pdfmake publishes both ESM and CJS bundles. In serverless (Nitro on Vercel) we need a synchronous require.
// The Roboto fonts are embedded in the CJS vfs bundle.
export const loadPdfmakeVfs = () => {
  try {
    const cjs = require("pdfmake/build/vfs_fonts.cjs");
    if (cjs?.pdfMake?.vfs) return cjs.pdfMake.vfs;
  } catch (error) {
    // ignore, fall through to .js fallback
  }

  const fallback = require("pdfmake/build/vfs_fonts.js");
  if (fallback?.pdfMake?.vfs) return fallback.pdfMake.vfs;
  if (typeof fallback === "object" && fallback !== null) return fallback;
  throw new Error("Unable to load pdfmake virtual font data");
};
