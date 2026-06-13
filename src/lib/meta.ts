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

export function setPageMeta(opts: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}) {
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
}

export function resetPageMeta() {
  setPageMeta({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    url: window.location.origin + "/",
    type: "website",
  });
}
