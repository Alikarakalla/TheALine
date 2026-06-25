// Core tokens read from CSS variables (set by SiteSettingsProvider from the
// admin theme), falling back to the original brand values so the site looks
// identical when the backend is unavailable.
export const TEXT_COLOR = "var(--lb-text, #3A3A3A)";
export const GLOW_COLOR = "var(--lb-primary, #D9C49A)";
/** Raw hex fallbacks for the rare spots that need a real color value. */
export const TEXT_COLOR_HEX = "#3A3A3A";
export const GLOW_COLOR_HEX = "#D9C49A";
export const ASSET = "https://qclay.design/lovable/bags";
export const asset = (file: string) => `${ASSET}/${file}`;

// Shared page layout — one content width + side padding used by the header and
// every page so their left/right edges line up across the whole site.
export const PAGE_MAX = 1440;
export const PAGE_PAD = "clamp(24px, 4vw, 44px)";
// Distance from the viewport edge to the shared container's content edge — use
// for left/right-anchored content (hero, section text) so it lines up with the
// header at any width while the surrounding visuals stay full-bleed.
export const PAGE_EDGE = `calc(max(0px, (100% - ${PAGE_MAX}px) / 2) + ${PAGE_PAD})`;

// Signature "tubular curl" entrance — shared by every serif accent word.
export const curlInitial = {
  rotateX: -110,
  scaleY: 0.15,
  scaleX: 0.7,
  opacity: 0,
};

export const curlAnimate = {
  rotateX: [-110, -70, -20, 5, -2, 0],
  scaleY: [0.15, 0.4, 0.8, 1.04, 0.98, 1],
  scaleX: [0.7, 0.85, 0.95, 1.02, 1, 1],
  opacity: [0, 0.4, 0.85, 1, 1, 1],
};

export const curlTransition = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1] as const,
  times: [0, 0.2, 0.55, 0.75, 0.88, 1],
};
