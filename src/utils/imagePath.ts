// imagePath.ts - helper to normalize image src values for next/image
// Ensures that public folder images have a leading slash and leaves absolute/data URLs untouched.

export function normalizeImagePath(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src; // absolute or data URI
  if (src.startsWith('/')) return src; // already rooted
  return `/${src}`; // prepend slash
}

// Provide a safe placeholder function when image might be invalid
export function withPlaceholder(src?: string | null, placeholder: string = ''): string {
  const normalized = normalizeImagePath(src);
  return normalized || placeholder;
}
