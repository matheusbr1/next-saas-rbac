export function createSlug(text: string): string {
  return text
    .normalize('NFD') // Normalize to separate diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove symbols
    .trim() // Trim spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .toLowerCase() // Convert to lowercase
}
