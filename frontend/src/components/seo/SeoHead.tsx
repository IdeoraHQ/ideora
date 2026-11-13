import { useEffect } from 'react';

const SITE_URL = 'https://ideorahq.top';
const SITE_NAME = 'Ideora';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_IMAGE_ALT = 'Ideora — Where ideas find their builders';

export interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article' | 'profile';
  image?: string;
  imageAlt?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function normalizeCanonicalUrl(canonicalPath?: string): string {
  if (!canonicalPath || canonicalPath === '/') {
    return `${SITE_URL}/`;
  }
  if (canonicalPath.startsWith('http://') || canonicalPath.startsWith('https://')) {
    return canonicalPath;
  }
  const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  return `${SITE_URL}${normalizedPath}`;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath,
  noindex = false,
  ogType = 'website',
  image = DEFAULT_IMAGE,
  imageAlt = DEFAULT_IMAGE_ALT,
  jsonLd,
}) => {
  const canonicalUrl = normalizeCanonicalUrl(canonicalPath);
  const robotsContent = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1';
  const serializedJsonLd = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robotsContent);
    upsertCanonical(canonicalUrl);

    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', imageAlt);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    const existingScript = document.head.querySelector<HTMLScriptElement>(
      'script[data-seo-jsonld="route"]'
    );

    if (serializedJsonLd) {
      const script = existingScript ?? document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'route');
      script.textContent = serializedJsonLd;
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }

    return () => {
      const routeScript = document.head.querySelector<HTMLScriptElement>(
        'script[data-seo-jsonld="route"]'
      );
      if (routeScript) {
        routeScript.remove();
      }
    };
  }, [title, description, robotsContent, canonicalUrl, ogType, image, imageAlt, serializedJsonLd]);

  return null;
};

