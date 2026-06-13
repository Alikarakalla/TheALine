import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet } from "../lib/api";

export type HomepageContent = {
  hero: { line1: string; line2: string; accent: string; tail: string; loveBag: string };
  collection: { lead: string; accent: string; title: string; body: string };
  perfectmatch: { eyebrowTop: string; eyebrowBottom: string; lead: string; accent: string; body: string };
  story: { eyebrow: string; lead: string; accent: string; body: string };
  lookbook: { lead: string; accent: string };
  bento: { eyebrow: string; lead: string; accent: string };
  footer: { headlineLead: string; accent: string; body: string; marquee: string[] };
};

// Defaults mirror the original hardcoded copy, so first paint + entrance
// animations are identical; the API hydrate swaps in admin-managed copy.
export const HOMEPAGE_DEFAULTS: HomepageContent = {
  hero: {
    line1: "Bags crafted",
    line2: "to move with",
    accent: "your",
    tail: "story",
    loveBag:
      "Crafted with care and designed to follow you from day to night, it holds not only your essentials, but your stories",
  },
  collection: {
    lead: "Our",
    accent: "new",
    title: "Collection",
    body: "Crafted with care and designed to follow you from day to night, it holds not only your essentials, but your stories",
  },
  perfectmatch: {
    eyebrowTop: "DESIGNED WITH PURPOSE.",
    eyebrowBottom: "WORN WITH CONFIDENCE.",
    lead: "Find your",
    accent: "match",
    body: "We believe a bag is more than an accessory — It's a companion to your every moment. From the daily rush to quiet evenings, our pieces are crafted to be effortlessly elegant, enduring, and distinctively yours.",
  },
  story: {
    eyebrow: "OUR CRAFT",
    lead: "Made by",
    accent: "hand",
    body: "Every bag begins as a single hide, cut by hand and stitched over days, not minutes — leather chosen to age into something softer, richer, unmistakably yours.",
  },
  lookbook: { lead: "The", accent: "lookbook" },
  bento: { eyebrow: "THE FULL RANGE", lead: "One for every", accent: "mood" },
  footer: {
    headlineLead: "Carry your",
    accent: "story",
    body: "Pieces made to be lived in — from the morning rush to the last light of the day. Find the one that's yours.",
    marquee: ["CRAFTED", "ENDURING", "EFFORTLESS", "DISTINCTLY YOURS"],
  },
};

const Ctx = createContext<HomepageContent>(HOMEPAGE_DEFAULTS);
export function useHomepage() {
  return useContext(Ctx);
}

export function HomepageContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HomepageContent>(HOMEPAGE_DEFAULTS);

  useEffect(() => {
    apiGet<Partial<HomepageContent>>("homepage")
      .then((data) => {
        if (!data || typeof data !== "object") return;
        // Per-section shallow-merge over defaults so partial admin edits are safe.
        setContent((prev) => {
          const next: any = { ...prev };
          for (const key of Object.keys(prev) as (keyof HomepageContent)[]) {
            if (data[key] && typeof data[key] === "object") {
              next[key] = { ...prev[key], ...(data[key] as object) };
            }
          }
          return next;
        });
      })
      .catch(() => {});
  }, []);

  return <Ctx.Provider value={content}>{children}</Ctx.Provider>;
}
