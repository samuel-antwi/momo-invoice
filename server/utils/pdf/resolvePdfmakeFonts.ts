// Use statically bundled fonts instead of dynamic loading for better Vercel compatibility
import staticFonts from "./staticFonts.js";

export const loadPdfmakeVfs = async (): Promise<Record<string, string>> => {
  // The static fonts are directly the font data
  if (staticFonts && typeof staticFonts === "object") {
    const fonts = Object.keys(staticFonts);
    if (fonts.some(key => key.endsWith('.ttf'))) {
      return staticFonts;
    }
  }

  throw new Error("Unable to load static pdfmake font data");
};
