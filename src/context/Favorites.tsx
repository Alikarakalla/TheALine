import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./Auth";
import { apiCustomer, apiCustomerGet } from "../lib/api";

type Ctx = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  count: number;
};

const FavCtx = createContext<Ctx | null>(null);

export function useFavorites() {
  const ctx = useContext(FavCtx);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

const KEY = "lovebag-favorites";

function load(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<string[]>(load);
  const synced = useRef(false);

  // Guests persist to localStorage; signed-in users sync with the API.
  useEffect(() => {
    if (!user) {
      synced.current = false;
      setIds(load());
      return;
    }
    // On login, push any guest favorites up, then load the account's list.
    const guest = load();
    (async () => {
      try {
        if (!synced.current && guest.length) {
          await Promise.all(guest.map((id) => apiCustomer("POST", "favorites", { productId: id }).catch(() => {})));
        }
        synced.current = true;
        const server = await apiCustomerGet<string[]>("favorites");
        setIds(server);
        localStorage.removeItem(KEY);
      } catch {
        /* keep current ids on failure */
      }
    })();
  }, [user]);

  useEffect(() => {
    if (user) return; // only persist guest favorites locally
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids, user]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const exists = prev.includes(id);
        if (user) {
          if (exists) apiCustomer("DELETE", `favorites/${id}`).catch(() => {});
          else apiCustomer("POST", "favorites", { productId: id }).catch(() => {});
        }
        return exists ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [user]
  );

  const remove = useCallback(
    (id: string) => {
      if (user) apiCustomer("DELETE", `favorites/${id}`).catch(() => {});
      setIds((prev) => prev.filter((x) => x !== id));
    },
    [user]
  );

  const count = useMemo(() => ids.length, [ids]);

  return (
    <FavCtx.Provider value={{ ids, has, toggle, remove, count }}>
      {children}
    </FavCtx.Provider>
  );
}
