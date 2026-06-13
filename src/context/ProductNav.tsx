import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Product } from "../lib/products";

export type OriginRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type Origin = {
  id: string;
  rect: OriginRect;
  imgSrc: string;
  scrollY: number;
};

type Ctx = {
  /** Navigate to a product page, remembering where it was clicked for the morph. */
  open: (product: Product, el: Element, imgSrc: string) => void;
  /** Return to where we came from. */
  close: () => void;
  /** Consume the stored origin for a given product id (for the shared-element morph). */
  consumeOrigin: (id: string) => Origin | null;
};

const ProductNavCtx = createContext<Ctx | null>(null);

export function useProductNav() {
  const ctx = useContext(ProductNavCtx);
  if (!ctx)
    throw new Error("useProductNav must be used within ProductNavProvider");
  return ctx;
}

export function ProductNavProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const originRef = useRef<Origin | null>(null);
  const cameFromAppRef = useRef(false);

  const open = useCallback(
    (product: Product, el: Element, imgSrc: string) => {
      const r = el.getBoundingClientRect();
      originRef.current = {
        id: product.id,
        imgSrc,
        scrollY: window.scrollY,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      };
      cameFromAppRef.current = true;
      // Remember the page we came from so it stays mounted behind the product
      // (keeps the morph seamless) while /product/:id is still a real URL.
      navigate(`/product/${product.id}`, {
        state: { background: location },
      });
    },
    [navigate, location]
  );

  const consumeOrigin = useCallback((id: string) => {
    const o = originRef.current;
    return o && o.id === id ? o : null;
  }, []);

  const close = useCallback(() => {
    if (cameFromAppRef.current) {
      cameFromAppRef.current = false;
      navigate(-1);
    } else {
      navigate("/");
    }
  }, [navigate]);

  return (
    <ProductNavCtx.Provider value={{ open, close, consumeOrigin }}>
      {children}
    </ProductNavCtx.Provider>
  );
}
