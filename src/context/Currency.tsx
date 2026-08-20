import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { apiGet } from "../lib/api";
import { usePreferences } from "./Preferences";

/**
 * Store currencies, managed in Admin → Currencies. Prices everywhere in the
 * catalog and checkout are stored in the BASE currency; this context converts
 * them for display into whichever active currency the shopper selects.
 */

export type StoreCurrency = {
  id: number;
  code: string;
  nameEn: string;
  nameAr?: string | null;
  symbol: string;
  rate: number;
  decimals: number;
  isBase: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

// Sensible offline fallback so prices render before/without the API.
const FALLBACK: StoreCurrency[] = [
  { id: 0, code: "EUR", nameEn: "Euro", symbol: "€", rate: 1, decimals: 2, isBase: true },
];

/** "€12.50" / "$12" / "1,200,000 LBP" — single-character symbols read as
 *  prefixes, letter codes as suffixes. `approx` drops the decimals (labels
 *  like price-filter bounds). */
const fmtWith = (c: StoreCurrency | undefined, baseAmount: number, approx = false) => {
  const digits = approx ? 0 : c?.decimals ?? 2;
  const amount = (baseAmount * (c?.rate ?? 1)).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const sym = c?.symbol ?? "€";
  return sym.length === 1 ? `${sym}${amount}` : `${amount} ${sym}`;
};

/* The base currency is also readable through a tiny external store, so every
 * "stored amount" in the project (orders, receipts, admin statistics, field
 * labels) renders with whatever base is configured in Admin → Currencies —
 * even in components that don't care about the shopper's display currency. */
let baseSnap: StoreCurrency = FALLBACK[0];
const baseListeners = new Set<() => void>();
const publishBase = (rows: StoreCurrency[]) => {
  const b = rows.find((c) => c.isBase) ?? rows[0];
  if (b && b !== baseSnap) {
    baseSnap = b;
    baseListeners.forEach((l) => l());
  }
};

/** The store's base currency — for labels like `Price (${base.symbol})`. */
export function useBaseCurrency(): StoreCurrency {
  return useSyncExternalStore(
    (cb) => {
      baseListeners.add(cb);
      return () => {
        baseListeners.delete(cb);
      };
    },
    () => baseSnap
  );
}

/** Format an amount that IS in the base currency (orders, admin stats). */
export function useBaseMoney() {
  const c = useBaseCurrency();
  return useCallback((n: number, approx = false) => fmtWith(c, n, approx), [c]);
}

type Ctx = {
  currencies: StoreCurrency[];
  current: StoreCurrency;
  setCurrency: (code: string) => void;
  /** Format a BASE-currency amount in the selected display currency. */
  format: (baseAmount: number, approx?: boolean) => string;
};

const CurrencyCtx = createContext<Ctx | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyCtx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/** Shorthand: just the formatter. */
export function useMoney() {
  return useCurrency().format;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { prefs, set } = usePreferences();
  const [currencies, setCurrencies] = useState<StoreCurrency[]>(FALLBACK);

  useEffect(() => {
    apiGet<StoreCurrency[]>("currencies")
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) {
          setCurrencies(rows);
          publishBase(rows);
        }
      })
      .catch(() => {});
  }, []);

  const current = useMemo(() => {
    return (
      currencies.find((c) => c.code === prefs.currency) ??
      currencies.find((c) => c.isBase) ??
      currencies[0]
    );
  }, [currencies, prefs.currency]);

  const setCurrency = useCallback((code: string) => set({ currency: code }), [set]);

  const format = useCallback(
    (baseAmount: number, approx = false) => fmtWith(current, baseAmount, approx),
    [current]
  );

  return (
    <CurrencyCtx.Provider value={{ currencies, current, setCurrency, format }}>
      {children}
    </CurrencyCtx.Provider>
  );
}
