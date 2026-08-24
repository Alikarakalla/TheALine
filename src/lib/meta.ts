export const DEFAULT_TITLE = "The A Line — Bags crafted to move with your story";
export const DEFAULT_DESC =
  "Crafted with care and designed to follow you from day to night. Discover the new collection of leather bags from The A Line.";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

/**
 * Which mount currently owns the document head.
 *
 * Pages overlay each other (a product opens on top of the page that launched
 * it, and switching products cross-fades two ProductPages), so the OUTGOING
 * page's cleanup runs *after* the incoming one has already set its own title.
 * Each setPageMeta() claims a fresh token; resetPageMeta() only reverts when
 * the caller still holds it, so a stale unmount can't clobber the live title.
 */
let metaOwner = 0;

export function setPageMeta(opts: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}): number {
  const url = opts.url ?? window.location.href;
  document.title = opts.title;
  upsertMeta("name", "description", opts.description);
  upsertMeta("property", "og:title", opts.title);
  upsertMeta("property", "og:description", opts.description);
  upsertMeta("property", "og:type", opts.type ?? "website");
  upsertMeta("property", "og:url", url);
  if (opts.image) {
    upsertMeta("property", "og:image", opts.image);
    upsertMeta("name", "twitter:image", opts.image);
  }
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", opts.title);
  upsertMeta("name", "twitter:description", opts.description);
  setCanonical(url);
  return ++metaOwner;
}

/**
 * Restore the site defaults — but only if `token` (from the matching
 * setPageMeta call) is still the current owner. Called without a token it
 * resets unconditionally, for genuine teardown.
 */
export function resetPageMeta(token?: number) {
  if (token != null && token !== metaOwner) return;
  setPageMeta({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    url: window.location.origin + "/",
    type: "website",
  });
}
