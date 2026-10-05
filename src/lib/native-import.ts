/**
 * Native dynamic import that survives TypeScript/Vercel's CommonJS transpilation
 * (several dependencies such as better-auth are ESM-only).
 *
 * SECURITY: `specifier` must ALWAYS be a hard-coded string literal at the call
 * site — never user input or environment data.
 */
export async function nativeImport<T = any>(specifier: string): Promise<T> {
  const importer = new Function("specifier", "return import(specifier);") as (s: string) => Promise<T>;
  return importer(specifier);
}
