import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../lib/products";
import { productImageFile } from "../lib/products";
import { asset } from "../lib/constants";

export type CartItem = {
  id: string; // productId:colorName
  productId: string;
  name: string;
  category: string;
  colorName: string;
  colorHex: string;
  price: number;
  image: string;
  qty: number;
};

type Ctx = {
  items: CartItem[];
  add: (product: Product, color: { name: string; hex: string }, qty: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartCtx = createContext<Ctx | null>(null);

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const KEY = "lovebag-cart";

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const add = useCallback<Ctx["add"]>((product, color, qty) => {
    const id = `${product.id}:${color.name}`;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id);
      if (existing)
        return prev.map((i) =>
          i.id === id ? { ...i, qty: i.qty + qty } : i
        );
      return [
        ...prev,
        {
          id,
          productId: product.id,
          name: product.name,
          category: product.category,
          colorName: color.name,
          colorHex: color.hex,
          price: product.price,
          image: product.images?.[0] ?? asset(productImageFile(product)),
          qty,
        },
      ];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.qty, 0),
    [items]
  );

  return (
    <CartCtx.Provider
      value={{ items, add, remove, setQty, clear, count, subtotal }}
    >
      {children}
    </CartCtx.Provider>
  );
}
