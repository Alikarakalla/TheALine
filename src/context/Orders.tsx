import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "./Cart";
import { useAuth } from "./Auth";
import { apiCustomerGet } from "../lib/api";

export type GiftOptions = { isGift: boolean; note?: string; wrap: boolean };

export type Order = {
  number: string;
  createdAt: number;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  email: string;
  name: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  discount?: number;
  gift?: GiftOptions;
  trackingNumber?: string;
};

type Ctx = {
  orders: Order[];
  addOrder: (o: Order) => void;
  getOrder: (number: string) => Order | undefined;
};

const OrdersCtx = createContext<Ctx | null>(null);

export function useOrders() {
  const ctx = useContext(OrdersCtx);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}

const toTs = (s: any): number => {
  if (typeof s === "number") return s;
  if (typeof s === "string") {
    const t = new Date(s.replace(" ", "T")).getTime();
    return Number.isNaN(t) ? Date.now() : t;
  }
  return Date.now();
};

export function mapApiOrder(o: any): Order {
  return {
    number: o.number,
    createdAt: toTs(o.createdAt),
    items: (o.items || []).map((it: any): CartItem => ({
      id: String(it.id ?? `${o.number}-${it.name}`),
      productId: it.productId ?? "",
      name: it.name,
      category: it.category ?? "",
      colorName: it.colorName ?? "",
      colorHex: it.colorHex ?? "",
      price: Number(it.unitPrice ?? it.price ?? 0),
      image: it.image ?? "",
      qty: Number(it.qty ?? 1),
    })),
    subtotal: Number(o.subtotal ?? 0),
    shipping: Number(o.shipping ?? 0),
    total: Number(o.total ?? 0),
    email: o.email ?? "",
    name: o.name ?? "",
    pointsEarned: o.pointsEarned,
    pointsRedeemed: o.pointsRedeemed,
    discount: o.discount,
    trackingNumber: o.trackingNumber ?? undefined,
    gift: o.gift ? { isGift: true, note: o.gift.note, wrap: !!o.gift.wrap } : undefined,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    apiCustomerGet<any[]>("orders")
      .then((rows) => setOrders(rows.map(mapApiOrder)))
      .catch(() => setOrders([]));
  }, [user]);

  const addOrder = useCallback((o: Order) => {
    setOrders((prev) => (prev.some((x) => x.number === o.number) ? prev : [o, ...prev]));
  }, []);
  const getOrder = useCallback(
    (number: string) => orders.find((o) => o.number === number),
    [orders]
  );

  return (
    <OrdersCtx.Provider value={{ orders, addOrder, getOrder }}>
      {children}
    </OrdersCtx.Provider>
  );
}
