// "Lovebag Circle" loyalty program — pure config & helpers.
// Currency: "Glow Points". 100 Glow Points = €1.

export type Tier = {
  id: "bloom" | "bouquet" | "atelier";
  name: string;
  min: number; // lifetime spend (EUR) threshold
  earnRate: number; // points per €1
  freeShipThreshold: number; // 0 = always free
  perks: string[];
};

export const TIERS: Tier[] = [
  {
    id: "bloom",
    name: "Bloom",
    min: 0,
    earnRate: 1,
    freeShipThreshold: 100,
    perks: [
      "1 Glow Point per €1 spent",
      "Free shipping over €100",
      "A birthday reward",
      "Member-only sales",
    ],
  },
  {
    id: "bouquet",
    name: "Bouquet",
    min: 500,
    earnRate: 1.25,
    freeShipThreshold: 75,
    perks: [
      "1.25 Glow Points per €1 spent",
      "Free shipping over €75",
      "Early access to new drops",
      "Double birthday reward",
    ],
  },
  {
    id: "atelier",
    name: "Atelier",
    min: 1500,
    earnRate: 1.5,
    freeShipThreshold: 0,
    perks: [
      "1.5 Glow Points per €1 spent",
      "Always free shipping",
      "First access to new collections",
      "Complimentary gift wrapping",
      "Priority concierge",
    ],
  },
];

export const POINTS_PER_EURO = 100; // 100 pts == €1
export const SIGNUP_BONUS = 200;
export const REVIEW_BONUS = 50;
export const BIRTHDAY_BONUS = 150;
export const REFERRAL_GIVE = 300; // referrer, on friend's first order
export const REFERRAL_GET = 150; // new friend, at signup
export const NEWSLETTER_BONUS = 100;
export const REDEEM_MIN = 500; // min points redeemable at checkout
export const REDEEM_STEP = 500;

export function getTier(lifetimeSpend: number): Tier {
  let t = TIERS[0];
  for (const tier of TIERS) if (lifetimeSpend >= tier.min) t = tier;
  return t;
}
export function nextTier(lifetimeSpend: number): Tier | null {
  const current = getTier(lifetimeSpend);
  const idx = TIERS.findIndex((t) => t.id === current.id);
  return TIERS[idx + 1] ?? null;
}
export function progressToNext(lifetimeSpend: number): number {
  const current = getTier(lifetimeSpend);
  const next = nextTier(lifetimeSpend);
  if (!next) return 1;
  return Math.min(
    1,
    Math.max(0, (lifetimeSpend - current.min) / (next.min - current.min))
  );
}
export function spendToNextTier(lifetimeSpend: number): number {
  const next = nextTier(lifetimeSpend);
  return next ? Math.max(0, next.min - lifetimeSpend) : 0;
}
export function freeShippingThresholdFor(lifetimeSpend: number): number {
  return getTier(lifetimeSpend).freeShipThreshold;
}

export const euroValueOfPoints = (pts: number) => pts / POINTS_PER_EURO;
export const pointsForEuros = (eur: number) => Math.round(eur * POINTS_PER_EURO);
export const pointsForSpend = (eur: number, earnRate: number) =>
  Math.floor(eur * earnRate);

/** Max € that can be redeemed: capped at 50% of subtotal and your balance. */
export function maxRedeemEuros(subtotal: number, points: number) {
  return Math.min(subtotal * 0.5, euroValueOfPoints(points));
}

export type Reward = {
  id: string;
  label: string;
  description: string;
  cost: number; // points
  kind: "shipping" | "discount" | "giftwrap" | "early";
  value?: number; // € discount value for "discount"
};

export const REWARD_CATALOG: Reward[] = [
  { id: "ship", label: "Free express shipping", description: "On your next order", cost: 600, kind: "shipping" },
  { id: "off10", label: "€10 off", description: "A €10 credit toward any order", cost: 1000, kind: "discount", value: 10 },
  { id: "giftwrap", label: "Signature gift wrapping", description: "Hand-tied, on us", cost: 400, kind: "giftwrap" },
  { id: "off25", label: "€25 off", description: "A €25 credit toward any order", cost: 2500, kind: "discount", value: 25 },
  { id: "early", label: "48h early access", description: "Shop new drops first", cost: 800, kind: "early" },
];

export const WAYS_TO_EARN: { icon: string; label: string; points: string }[] = [
  { icon: "✦", label: "Join the Circle", points: `+${SIGNUP_BONUS} pts` },
  { icon: "🛍", label: "Every €1 you spend", points: "1–1.5 pts" },
  { icon: "★", label: "Write a review", points: `+${REVIEW_BONUS} pts` },
  { icon: "🎂", label: "Your birthday", points: `+${BIRTHDAY_BONUS} pts` },
  { icon: "♥", label: "Refer a friend", points: `+${REFERRAL_GIVE} pts` },
  { icon: "✉", label: "Join the newsletter", points: `+${NEWSLETTER_BONUS} pts` },
];

export function makeReferralCode(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return "LOVE-" + h.toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
}
