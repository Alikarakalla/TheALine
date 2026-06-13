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
  categories: string[];
  colors: Swatch[];
  loading: boolean;
  reload: () => void;
};

const Ctx = createContext<CatalogValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(SEED);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<any[]>("products")
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) setProducts(rows.map(fromApi));
      })
      .catch(() => {
        /* keep the seed on failure — offline-friendly */
      })
      .finally(() => setLoading(false));
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
      colors,
      loading,
      reload: load,
    };
  }, [products, loading]);

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
