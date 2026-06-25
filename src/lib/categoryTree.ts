import type { CategoryNode } from "../context/Catalog";
import type { Product } from "./products";

/** Slug → node lookup across the whole nested tree. */
export function indexBySlug(nodes: CategoryNode[]): Map<string, CategoryNode> {
  const map = new Map<string, CategoryNode>();
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      map.set(n.slug, n);
      walk(n.children || []);
    }
  };
  walk(nodes);
  return map;
}

/** A node's own slug plus every slug nested beneath it. */
export function descendantSlugs(node: CategoryNode): string[] {
  const out: string[] = [];
  const walk = (n: CategoryNode) => {
    out.push(n.slug);
    (n.children || []).forEach(walk);
  };
  walk(node);
  return out;
}

/**
 * Does a product fall under any of the selected category slugs (matching that
 * category OR any of its descendants)? Matches on the product's own category
 * slugs, with a name fallback so the offline seed (no slugs) still filters.
 */
export function productInCategories(
  product: Product,
  selectedSlugs: string[],
  bySlug: Map<string, CategoryNode>
): boolean {
  if (!selectedSlugs.length) return true;
  const wanted = new Set<string>();
  const wantedNames = new Set<string>();
  for (const slug of selectedSlugs) {
    const node = bySlug.get(slug);
    if (!node) continue;
    for (const s of descendantSlugs(node)) wanted.add(s);
    // name fallback for products that only carry a category name (seed)
    const collectNames = (n: CategoryNode) => {
      wantedNames.add(n.name);
      (n.children || []).forEach(collectNames);
    };
    collectNames(node);
  }
  const have = product.categories?.map((c) => c.slug) ?? [];
  if (have.some((s) => wanted.has(s))) return true;
  return product.category ? wantedNames.has(product.category) : false;
}
