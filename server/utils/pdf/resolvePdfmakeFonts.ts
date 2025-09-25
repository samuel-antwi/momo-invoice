import { createRequire } from "node:module";

const loadModule = async (specifier: string): Promise<any> => {
  try {
    // Try direct import first
    return await import(specifier);
  } catch (error) {
    try {
      // Try using require.resolve to get the actual path
      const require = createRequire(import.meta.url);
      const resolvedPath = require.resolve(specifier);
      return await import(resolvedPath);
    } catch (innerError) {
      console.error(`Unable to load pdfmake font bundle: ${specifier}`, innerError);
      return null;
    }
  }
};

const extractVfs = (mod: any): Record<string, string> | undefined => {
  if (!mod) return undefined;

  // Check for nested pdfMake.vfs structure
  if (mod.pdfMake?.vfs) return mod.pdfMake.vfs;
  if (mod.default?.pdfMake?.vfs) return mod.default.pdfMake.vfs;

  // Check for direct font files in default export (newer pdfmake structure)
  if (typeof mod.default === "object") {
    const fonts = Object.keys(mod.default);
    if (fonts.some(key => key.endsWith('.ttf'))) {
      return mod.default;
    }
  }

  return undefined;
};

export const loadPdfmakeVfs = async (): Promise<Record<string, string>> => {
  // Only try the .js file since .cjs doesn't exist in current pdfmake versions
  const esmModule = await loadModule("pdfmake/build/vfs_fonts.js");
  const esmVfs = extractVfs(esmModule);
  if (esmVfs) return esmVfs;

  // Fallback: check if the module itself contains font data
  if (esmModule && typeof esmModule === "object") {
    const entry = Object.entries(esmModule).filter(([, value]) => typeof value === "string");
    if (entry.length > 0) {
      return Object.fromEntries(entry) as Record<string, string>;
    }
  }

  throw new Error("Unable to load pdfmake virtual font data");
};
