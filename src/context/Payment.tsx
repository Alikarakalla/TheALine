import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./Auth";
import { apiCustomer, apiCustomerGet } from "../lib/api";

export type Card = {
  id: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Card";
  last4: string;
  expMonth: string;
  expYear: string;
  holder: string;
  isDefault: boolean;
};

type Ctx = {
  cards: Card[];
  defaultCard: Card | undefined;
  add: (input: { number: string; expMonth: string; expYear: string; holder: string; isDefault?: boolean }) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
};

const PayCtx = createContext<Ctx | null>(null);
export function usePayment() {
  const ctx = useContext(PayCtx);
  if (!ctx) throw new Error("usePayment must be used within PaymentProvider");
  return ctx;
}

const fromApi = (c: any): Card => ({
  id: String(c.id),
  brand: (c.brand as Card["brand"]) ?? "Card",
  last4: c.last4 ?? "",
  expMonth: c.expMonth ?? "",
  expYear: c.expYear ?? "",
  holder: c.holder ?? "",
  isDefault: !!c.isDefault,
});

export function PaymentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);

  const reload = useCallback(() => {
    if (!user) {
      setCards([]);
      return;
    }
    apiCustomerGet<any[]>("payment-methods")
      .then((rows) => setCards(rows.map(fromApi)))
      .catch(() => setCards([]));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add: Ctx["add"] = (input) => {
    // Full PAN is sent once; the backend stores only brand + last4.
    apiCustomer("POST", "payment-methods", input).then(reload).catch(() => {});
  };
  const remove: Ctx["remove"] = (id) => {
    apiCustomer("DELETE", `payment-methods/${id}`).then(reload).catch(() => {});
  };
  const setDefault: Ctx["setDefault"] = (id) => {
    apiCustomer("PUT", `payment-methods/${id}`, { isDefault: true }).then(reload).catch(() => {});
  };

  return (
    <PayCtx.Provider value={{ cards, defaultCard: cards.find((c) => c.isDefault), add, remove, setDefault }}>
      {children}
    </PayCtx.Provider>
  );
}
