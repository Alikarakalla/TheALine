import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiSend, getToken, setToken } from "../lib/api";

export type AdminUser = { id: number; name: string; email: string; role: string };

type Ctx = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminAuthCtx = createContext<Ctx | null>(null);
export function useAdminAuth() {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from a stored token.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiSend<AdminUser>("GET", "auth/me", undefined, true);
        if (alive) setAdmin(me);
      } catch {
        setToken(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiSend<{ token: string; admin: AdminUser }>(
      "POST",
      "auth/login",
      { email, password },
      false
    );
    setToken(res.token);
    setAdmin(res.admin);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthCtx.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthCtx.Provider>
  );
}
