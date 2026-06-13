import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import SearchOverlay from "../components/SearchOverlay";

type Ctx = { isOpen: boolean; open: () => void; close: () => void };

const SearchCtx = createContext<Ctx | null>(null);

export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  // Global shortcut: ⌘K / Ctrl-K (and "/" when not typing) opens search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (
        k === "/" &&
        !isOpen &&
        !["INPUT", "TEXTAREA"].includes(
          (document.activeElement?.tagName || "").toUpperCase()
        )
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <SearchCtx.Provider value={{ isOpen, open, close }}>
      {children}
      <AnimatePresence>
        {isOpen && <SearchOverlay onClose={close} />}
      </AnimatePresence>
    </SearchCtx.Provider>
  );
}
