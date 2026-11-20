/**
 * Validate and normalize user-supplied external URLs so only safe http(s)
 * protocols can be rendered or persisted (blocks javascript:, data:, vbscript:, etc.).
 */
export function sanitizeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    // Allow bare domain inputs like "github.com/user" only if no scheme/colon/leading slash is present
    if (!trimmed.includes(':') && !trimmed.startsWith('/')) {
      try {
        const withHttps = new URL(`https://${trimmed}`);
        if (withHttps.protocol === 'https:') {
          return withHttps.toString();
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Strip PostgREST filter syntax characters before interpolating search text
 * into `.or(...)` / `.ilike` filter expressions.
 */
export function sanitizePostgrestSearch(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/[,()\\*%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
