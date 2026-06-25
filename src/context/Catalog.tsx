import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiGet } from "../lib/api";
import { asset } from "../lib/constants";
import {
  PRODUCT_LIST,
  getGallery,
  type Product,
  type Swatch,
  type Badge,
} from "../lib/products";

/** A node in the nested category tree (GET /categories). */
export type CategoryNode = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  image?: string | null;
  status: string;
  productCount: number;
  /** Distinct products in this category or any descendant. */
  totalCount: number;
  children: CategoryNode[];
};

/** A storefront-facing collection summary (GET /collections). */
export type CollectionSummary = { id: number; title: string; slug: string; image?: string | null };

/** Depth-first flatten of the tree, carrying the nesting depth of each node. */
function flattenTree(nodes: CategoryNode[], depth = 0): { node: CategoryNode; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...flattenTree(n.children || [], depth + 1)]);
}

/**
 * Maps a raw API product (ProductsController::shape) into the storefront
 * `Product` shape the components already consume — so nothing downstream has to
 * change. Images come straight from the API (identical to the asset() gallery
 * for the seeded catalog, and reflect admin uploads going forward).
 */
function fromApi(p: any): Product {
  return {
    id: p.id,
    dbId: p.dbId,
    name: p.name,
    price: Number(p.price) || 0,
    category: p.category || "",
    categories: Array.isArray(p.categories) ? p.categories : undefined,
    tags: Array.isArray(p.tags) ? p.tags : undefined,
    compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : undefined,
    attributes: Array.isArray(p.attributes) ? p.attributes : undefined,
    variants: Array.isArray(p.variants) ? p.variants : undefined,
    panel: p.panel || "#ECE7DE",
    colors: (p.colors || []).map((c: any): Swatch => ({ name: c.name, hex: c.hex ?? "" })),
    description: p.description || "",
    details: p.details || "",
    materials: p.materials || "",
    rating: p.rating != null ? Number(p.rating) : undefined,
    reviewCount: p.reviewCount != null ? Number(p.reviewCount) : undefined,
    badge: (p.badge || undefined) as Badge | undefined,
    stock: p.stock != null ? Number(p.stock) : undefined,
    dimensions: p.dimensions || undefined,
    weight: p.weight || undefined,
    care: p.care || undefined,
    fit: p.fit || undefined,
    images: Array.isArray(p.images) && p.images.length ? p.images : undefined,
  };
}

// Seed from the static catalog so first paint + entrance animations are
// identical to before; the API hydrate swaps in live data without remounting.
const SEED: Product[] = PRODUCT_LIST.map((p) => ({
  ...p,
  images: p.images ?? getGallery(p).map(asset),
}));

type CatalogValue = {
  products: Product[];
  byId: Record<string, Product>;
  getById: (id: string | undefined) => Product | undefined;
  /** Flat list of category names (product-derived) — legacy consumers. */
  categories: string[];
  /** Nested category tree from the API (empty while offline / on the seed). */
  categoryTree: CategoryNode[];
  /** Depth-first flatten of `categoryTree`, with each node's nesting depth. */
  categoryNodes: { node: CategoryNode; depth: number }[];
  /** Active storefront collections (for nav / links). */
  collections: CollectionSummary[];
  colors: Swatch[];
  loading: boolean;
  reload: () => void;
};

const Ctx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(SEED);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<any[]>("products")
      .then((rows) => {
        // Reflect the live catalog exactly — even when empty — so deleting all
        // products actually empties the storefront. The static seed only stays
        // as an offline fallback (the .catch below keeps it on a failed fetch).
        if (Array.isArray(rows)) setProducts(rows.map(fromApi));
      })
      .catch(() => {
        /* keep the seed on failure — offline-friendly */
      })
      .finally(() => setLoading(false));
    apiGet<CategoryNode[]>("categories")
      .then((tree) => setCategoryTree(Array.isArray(tree) ? tree : []))
      .catch(() => {
        /* no nav tree offline — Shop falls back to flat name filtering */
      });
    apiGet<CollectionSummary[]>("collections")
      .then((rows) => setCollections(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  };
  useEffect(load, []);

  const value = useMemo<CatalogValue>(() => {
    const byId: Record<string, Product> = {};
    for (const p of products) byId[p.id] = p;
    const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    const seenColors = new Map<string, string>();
    for (const p of products) for (const c of p.colors) if (!seenColors.has(c.name)) seenColors.set(c.name, c.hex);
    const colors = Array.from(seenColors, ([name, hex]) => ({ name, hex }));
    return {
      products,
      byId,
      getById: (id) => (id ? byId[id] : undefined),
      categories,
      categoryTree,
      categoryNodes: flattenTree(categoryTree),
      collections,
      colors,
      loading,
      reload: load,
    };
  }, [products, categoryTree, collections, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog must be used within CatalogProvider");
  return v;
}

/** Index of a product within the live catalog (1-based), for legacy image math. */
export function catalogIndex(products: Product[], id: string): number {
  const i = products.findIndex((p) => p.id === id);
  return (i < 0 ? 0 : i) + 1;
}
