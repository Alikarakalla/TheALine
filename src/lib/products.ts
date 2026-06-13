export type Swatch = { name: string; hex: string };

export type Badge = "New" | "Bestseller" | "Limited";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  /** soft background tone for the product-page image panel */
  panel: string;
  colors: Swatch[];
  description: string;
  details: string;
  materials: string;
  // enrichment (filled below)
  rating?: number; // 0..5
  reviewCount?: number;
  badge?: Badge;
  stock?: number;
  dimensions?: string;
  weight?: string;
  care?: string;
  fit?: string;
  /** Full image URLs (from the API). Falls back to the asset() gallery convention. */
  images?: string[];
  /** DB primary key (present on API-sourced products; absent on static seed). */
  dbId?: number;
};

export const LOW_STOCK_THRESHOLD = 5;
export const isSoldOut = (p: Product) => (p.stock ?? 99) <= 0;
export const isLowStock = (p: Product) =>
  (p.stock ?? 99) > 0 && (p.stock ?? 99) <= LOW_STOCK_THRESHOLD;

export const PRODUCTS: Record<string, Product> = {
  Terra: {
    id: "terra",
    name: "Terra",
    price: 129.9,
    category: "Everyday tote",
    panel: "#E8E0D2",
    colors: [
      { name: "Cognac", hex: "#9c5a2d" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Sand", hex: "#d8c7a8" },
    ],
    description:
      "A roomy, unstructured tote that softens with every wear. Made to carry the whole day — laptop, lunch, the unexpected.",
    details:
      "Open top with magnetic closure. Internal zip pocket and two slip pockets. Handheld or shoulder carry.",
    materials: "Full-grain Italian leather, cotton twill lining, brass hardware.",
  },
  "Love Bag": {
    id: "love-bag",
    name: "Love Bag",
    price: 149.9,
    category: "Evening clutch",
    panel: "#ECE7DE",
    colors: [
      { name: "Blush", hex: "#e7c4c0" },
      { name: "Noir", hex: "#1a1a1a" },
      { name: "Ivory", hex: "#efe9dd" },
    ],
    description:
      "Our signature piece. A sculptural little bag that holds the essentials and turns every evening into an occasion.",
    details:
      "Framed clasp closure. Detachable chain strap. Fits phone, cards and a lipstick.",
    materials: "Nappa leather, suede lining, gold-tone hardware.",
  },
  "Amélie": {
    id: "amelie",
    name: "Amélie",
    price: 139.9,
    category: "City shoulder",
    panel: "#E2E4E1",
    colors: [
      { name: "Black", hex: "#1a1a1a" },
      { name: "Olive", hex: "#5f6149" },
      { name: "Cream", hex: "#e8e2d2" },
    ],
    description:
      "Clean lines, structured body, an everyday shoulder bag that reads quietly expensive from across the room.",
    details:
      "Top zip closure. Adjustable shoulder strap. Two internal compartments.",
    materials: "Saffiano leather, microfibre lining, matte hardware.",
  },
  Belle: {
    id: "belle",
    name: "Belle",
    price: 159.9,
    category: "Structured carry",
    panel: "#E7DEDE",
    colors: [
      { name: "Bordeaux", hex: "#6e2230" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Tan", hex: "#b07a47" },
    ],
    description:
      "A confident, structured carry with a defined silhouette. The one you reach for when it matters.",
    details:
      "Twist-lock closure. Short top handle plus optional crossbody strap. Suede-lined interior.",
    materials: "Box calf leather, suede lining, polished hardware.",
  },
  Mira: {
    id: "mira",
    name: "Mira",
    price: 124.9,
    category: "Soft hobo",
    panel: "#EFEBE2",
    colors: [
      { name: "Cream", hex: "#e8e2d2" },
      { name: "Caramel", hex: "#b07a47" },
      { name: "Slate", hex: "#5a5f66" },
    ],
    description:
      "Slouchy, soft and effortless. A gathered hobo that moulds to you and never feels like a statement you didn't mean.",
    details:
      "Magnetic top closure. Single shoulder strap. Roomy single compartment with slip pocket.",
    materials: "Washed lambskin, cotton lining, antique hardware.",
  },
  Adele: {
    id: "adele",
    name: "Adele",
    price: 134.9,
    category: "Mini crossbody",
    panel: "#E9E2D7",
    colors: [
      { name: "Cognac", hex: "#9c5a2d" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Blush", hex: "#e7c4c0" },
    ],
    description:
      "Small but mighty. A mini crossbody for the days you want your hands free and your essentials close.",
    details:
      "Flap closure with magnetic snap. Adjustable crossbody strap. Card slots inside.",
    materials: "Pebbled leather, microfibre lining, gold-tone hardware.",
  },
};

const NAMES = Object.keys(PRODUCTS);

export function getProduct(name: string): Product {
  return PRODUCTS[name] ?? PRODUCTS[NAMES[0]];
}

/** Stable list, handy for related-products rows and index mapping. */
export const PRODUCT_LIST = NAMES.map((n) => PRODUCTS[n]);

// Catalog enrichment — ratings, stock (one sold-out, one low), badges, specs.
const ENRICH: Record<string, Partial<Product>> = {
  terra: {
    rating: 4.7, reviewCount: 128, badge: "Bestseller", stock: 24,
    dimensions: "38 × 30 × 13 cm", weight: "0.9 kg",
    care: "Wipe with a soft dry cloth. Store stuffed in the dust bag, away from direct sunlight.",
    fit: "Fits a 14\" laptop, A4 documents and the everyday essentials.",
  },
  "love-bag": {
    rating: 4.9, reviewCount: 86, badge: "New", stock: 12,
    dimensions: "20 × 12 × 6 cm", weight: "0.4 kg",
    care: "Spot clean with a damp cloth. Avoid contact with perfume and oils.",
    fit: "Holds a phone, cards and a lipstick. Detachable chain strap.",
  },
  amelie: {
    rating: 4.6, reviewCount: 64, stock: 18,
    dimensions: "28 × 20 × 10 cm", weight: "0.7 kg",
    care: "Wipe clean with a soft cloth. Condition lightly twice a year.",
    fit: "Roomy enough for a tablet, wallet and daily carry.",
  },
  belle: {
    rating: 4.8, reviewCount: 51, badge: "Limited", stock: 3,
    dimensions: "26 × 18 × 11 cm", weight: "0.8 kg",
    care: "Box calf — buff gently with a dry cloth to restore shine.",
    fit: "Structured carry for the essentials. Optional crossbody strap.",
  },
  mira: {
    rating: 4.8, reviewCount: 73, stock: 0,
    dimensions: "34 × 26 × 12 cm", weight: "0.6 kg",
    care: "Washed lambskin — handle with clean hands; natural creasing is part of its character.",
    fit: "Soft, slouchy single compartment with a slip pocket.",
  },
  adele: {
    rating: 4.5, reviewCount: 42, stock: 31,
    dimensions: "18 × 13 × 6 cm", weight: "0.35 kg",
    care: "Pebbled leather — wipe with a soft dry cloth.",
    fit: "Mini crossbody for phone, cards and keys.",
  },
};
PRODUCT_LIST.forEach((p) => Object.assign(p, ENRICH[p.id]));

export const PRODUCTS_BY_ID: Record<string, Product> = Object.fromEntries(
  PRODUCT_LIST.map((p) => [p.id, p])
);

export function getProductById(id: string | undefined): Product | undefined {
  return id ? PRODUCTS_BY_ID[id] : undefined;
}

/** Unique product categories, in catalog order. */
export const CATEGORIES = Array.from(
  new Set(PRODUCT_LIST.map((p) => p.category))
);

/** Unique colour swatches across the whole catalog, de-duped by name. */
export const ALL_COLORS = (() => {
  const seen = new Map<string, string>();
  for (const p of PRODUCT_LIST)
    for (const c of p.colors) if (!seen.has(c.name)) seen.set(c.name, c.hex);
  return Array.from(seen, ([name, hex]) => ({ name, hex }));
})();

/** 1-based index of a product (matches its baggy-N.png canonical image). */
export function productIndex(p: Product): number {
  return PRODUCT_LIST.findIndex((x) => x.id === p.id) + 1;
}

/** Canonical isolated product image filename, e.g. "baggy-3.png". */
export function productImageFile(p: Product): string {
  return `baggy-${productIndex(p)}.png`;
}

/**
 * Image gallery for a product (filenames). Includes the isolated studio shot
 * (baggy-N) and the lifestyle shots (photo-N) used across the site, so whichever
 * image was clicked is part of the gallery and the morph lands on it seamlessly.
 */
export function getGallery(p: Product): string[] {
  const i = productIndex(p);
  const a = (i % 6) + 1;
  const b = ((i + 2) % 6) + 1;
  return [
    `baggy-${i}.png`,
    `photo-${i}.png`,
    `photo-${a}.png`,
    `photo-${b}.png`,
  ];
}
