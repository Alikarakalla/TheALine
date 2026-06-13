import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import ToastViewport from "../components/Toast";

export type ToastTone = "default" | "success" | "error" | "reward";
export type ToastAction = { label: string; to?: string; onClick?: () => void };

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  image?: string;
  swatchHex?: string;
  action?: ToastAction;
  duration?: number; // ms; 0 = sticky
};

export type Toast = ToastInput & { id: string };

type Ctx = {
  toasts: Toast[];
  show: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let counter = 0;
const newId = () => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  counter += 1;
  return `t${counter}`;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );
  const clear = useCallback(() => setToasts([]), []);
  const show = useCallback((input: ToastInput) => {
    const id = newId();
    setToasts((prev) => [{ ...input, id }, ...prev].slice(0, 4));
    return id;
  }, []);

  return (
    <ToastCtx.Provider value={{ toasts, show, dismiss, clear }}>
      {children}
      <ToastViewport />
    </ToastCtx.Provider>
  );
}
