import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./Auth";
import { apiCustomer } from "../lib/api";

export type Currency = "EUR" | "USD" | "GBP";
export type Prefs = {
  newsletter: boolean;
  sms: boolean;
  offers: boolean;
  currency: Currency;
  reducedMotion?: boolean;
};

const DEFAULTS: Prefs = { newsletter: true, sms: false, offers: true, currency: "EUR" };

type Ctx = { prefs: Prefs; set: (patch: Partial<Prefs>) => void };

const PrefCtx = createContext<Ctx | null>(null);
export function usePreferences() {
  const ctx = useContext(PrefCtx);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

const KEY = "lovebag-prefs-guest";
const loadGuest = (): Prefs => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(loadGuest);

  // Seed from the account when signed in; from localStorage for guests.
  useEffect(() => {
    if (user) {
      setPrefs({
        ...DEFAULTS,
        ...(user.prefs as Partial<Prefs>),
        newsletter: user.marketingOptIn ?? DEFAULTS.newsletter,
      });
    } else {
      setPrefs(loadGuest());
    }
  }, [user]);

  const set: Ctx["set"] = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (user) {
        const body: Record<string, any> = { prefs: { sms: next.sms, offers: next.offers, currency: next.currency, reducedMotion: next.reducedMotion } };
        if (patch.newsletter !== undefined) body.marketingOptIn = patch.newsletter;
        apiCustomer("PUT", "auth/customer/preferences", body).catch(() => {});
      } else {
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  return <PrefCtx.Provider value={{ prefs, set }}>{children}</PrefCtx.Provider>;
}
