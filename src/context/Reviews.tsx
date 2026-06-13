import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SEED_REVIEWS, type Review } from "../lib/reviews";

type Ctx = {
  add: (r: Omit<Review, "id" | "createdAt">) => void;
  forProduct: (productId: string) => Review[];
  summary: (productId: string) => { avg: number; count: number; distribution: number[] };
};

const ReviewsCtx = createContext<Ctx | null>(null);
export function useReviews() {
  const ctx = useContext(ReviewsCtx);
  if (!ctx) throw new Error("useReviews must be used within ReviewsProvider");
  return ctx;
}

const KEY = "lovebag-reviews";
const load = (): Review[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
let rid = 0;
const newId = () => `r-${Date.now().toString(36)}-${(rid += 1)}`;

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Review[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }, [stored]);

  const all = [...SEED_REVIEWS, ...stored];

  const add: Ctx["add"] = (r) =>
    setStored((prev) => [{ ...r, id: newId(), createdAt: Date.now() }, ...prev]);

  const forProduct: Ctx["forProduct"] = (productId) =>
    all.filter((r) => r.productId === productId).sort((a, b) => b.createdAt - a.createdAt);

  const summary: Ctx["summary"] = (productId) => {
    const list = all.filter((r) => r.productId === productId);
    const count = list.length;
    const avg = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
    const distribution = [0, 0, 0, 0, 0]; // index 0 = 5★ ... index 4 = 1★
    list.forEach((r) => {
      const i = 5 - Math.round(r.rating);
      if (i >= 0 && i < 5) distribution[i] += 1;
    });
    return { avg, count, distribution };
  };

  return (
    <ReviewsCtx.Provider value={{ add, forProduct, summary }}>
      {children}
    </ReviewsCtx.Provider>
  );
}
