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

export type Address = {
  id: string;
  label: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
};

type Ctx = {
  addresses: Address[];
  defaultAddress: Address | undefined;
  add: (a: Omit<Address, "id" | "isDefault"> & { isDefault?: boolean }) => void;
  update: (id: string, patch: Partial<Address>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
};

const AddrCtx = createContext<Ctx | null>(null);
export function useAddresses() {
  const ctx = useContext(AddrCtx);
  if (!ctx) throw new Error("useAddresses must be used within AddressesProvider");
  return ctx;
}

const fromApi = (a: any): Address => ({
  id: String(a.id),
  label: a.label ?? "",
  fullName: a.fullName ?? "",
  line1: a.line1 ?? "",
  line2: a.line2 ?? "",
  city: a.city ?? "",
  postcode: a.postcode ?? "",
  country: a.country ?? "",
  phone: a.phone ?? "",
  isDefault: !!a.isDefault,
});

export function AddressesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);

  const reload = useCallback(() => {
    if (!user) {
      setAddresses([]);
      return;
    }
    apiCustomerGet<any[]>("addresses")
      .then((rows) => setAddresses(rows.map(fromApi)))
      .catch(() => setAddresses([]));
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add: Ctx["add"] = (a) => {
    apiCustomer("POST", "addresses", a).then(reload).catch(() => {});
  };
  const update: Ctx["update"] = (id, patch) => {
    apiCustomer("PUT", `addresses/${id}`, patch).then(reload).catch(() => {});
  };
  const remove: Ctx["remove"] = (id) => {
    apiCustomer("DELETE", `addresses/${id}`).then(reload).catch(() => {});
  };
  const setDefault: Ctx["setDefault"] = (id) => {
    apiCustomer("PUT", `addresses/${id}`, { isDefault: true }).then(reload).catch(() => {});
  };

  return (
    <AddrCtx.Provider
      value={{
        addresses,
        defaultAddress: addresses.find((a) => a.isDefault),
        add,
        update,
        remove,
        setDefault,
      }}
    >
      {children}
    </AddrCtx.Provider>
  );
}
