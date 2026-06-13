import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getCustomerToken, setCustomerToken } from "../lib/api";

export type User = {
  id?: number;
  name: string;
  email: string;
  phone?: string | null;
  marketingOptIn?: boolean;
  prefs?: Record<string, any>;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the stored customer token on mount.
  useEffect(() => {
    if (!getCustomerToken()) {
      setLoading(false);
      return;
    }
    api<User>("auth/customer/me", { customer: true })
      .then((u) => setUser(u))
      .catch(() => setCustomerToken(null))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; customer: User }>("auth/customer/login", {
      method: "POST",
      body: { email, password },
    });
    setCustomerToken(res.token);
    setUser(res.customer);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<{ token: string; customer: User }>("auth/customer/register", {
      method: "POST",
      body: { name, email, password },
    });
    setCustomerToken(res.token);
    setUser(res.customer);
  }, []);

  const signOut = useCallback(() => {
    setCustomerToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    const updated = await api<User>("auth/customer/profile", {
      method: "PUT",
      body: patch,
      customer: true,
    });
    setUser(updated);
  }, []);

  const refresh = useCallback(async () => {
    if (!getCustomerToken()) return;
    const u = await api<User>("auth/customer/me", { customer: true });
    setUser(u);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}
