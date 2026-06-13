import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Ctx = { ids: string[]; push: (id: string) => void; clear: () => void };

const RvCtx = createContext<Ctx | null>(null);
export function useRecentlyViewed() {
  const ctx = useContext(RvCtx);
  if (!ctx) throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  return ctx;
}

const KEY = "lovebag-recent-viewed";
const MAX = 8;
const load = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }, [ids]);

  const push = (id: string) =>
    setIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX));
  const clear = () => setIds([]);

  return <RvCtx.Provider value={{ ids, push, clear }}>{children}</RvCtx.Provider>;
}
