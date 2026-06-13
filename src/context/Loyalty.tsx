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
import {
  TIERS,
  getTier,
  nextTier as nextTierFor,
  progressToNext as progressFor,
  spendToNextTier,
  euroValueOfPoints,
  makeReferralCode,
  REWARD_CATALOG,
  type Tier,
} from "../lib/loyalty";

export type LedgerType =
  | "signup"
  | "purchase"
  | "redeem"
  | "review"
  | "birthday"
  | "referral_give"
  | "referral_get"
  | "newsletter"
  | "adjust";

export type LedgerEntry = {
  id: string;
  type: LedgerType;
  points: number;
  label: string;
  ts: number;
  orderNumber?: string;
  ref?: string;
};

export type RedeemedReward = {
  id: string;
  rewardId: string;
  ts: number;
  pointsCost: number;
  code: string;
  used: boolean;
};

type Ctx = {
  signedIn: boolean;
  points: number;
  lifetimeSpend: number;
  tier: Tier;
  next: Tier | null;
  progressToNext: number;
  spendToNext: number;
  ledger: LedgerEntry[];
  referralCode: string;
  redeemedRewards: RedeemedReward[];
  hasEarlyAccess: boolean;
  birthday?: string;
  earnForOrder: (
    order: { number: string; subtotal: number },
    eligibleSpend?: number
  ) => { pointsEarned: number; tierUp: boolean; newTier: Tier };
  redeemAtCheckout: (pts: number, orderNumber: string) => void;
  redeem: (rewardId: string) => string | null;
  recordReview: (productId: string) => void;
  setBirthday: (date: string) => void;
  claimBirthday: () => number;
  applyReferral: (code: string) => boolean;
  addNewsletterBonus: () => void;
};

const LoyaltyCtx = createContext<Ctx | null>(null);

export function useLoyalty() {
  const ctx = useContext(LoyaltyCtx);
  if (!ctx) throw new Error("useLoyalty must be used within LoyaltyProvider");
  return ctx;
}

const mapLedgerType = (t: string): LedgerType => {
  if (t === "earn") return "purchase";
  if (t === "redeem") return "redeem";
  if (t === "bonus") return "signup";
  if (t === "review") return "review";
  if (t === "birthday") return "birthday";
  return "adjust";
};
const toTs = (s: any): number => {
  const t = typeof s === "string" ? new Date(s.replace(" ", "T")).getTime() : s;
  return Number.isNaN(t) ? Date.now() : t;
};

export function LoyaltyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const [points, setPoints] = useState(0);
  const [lifetimeSpend, setLifetimeSpend] = useState(0);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [redeemed, setRedeemed] = useState<RedeemedReward[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [birthday, setBirthdayState] = useState<string | undefined>(undefined);

  const hydrate = useCallback(() => {
    if (!email) {
      setPoints(0); setLifetimeSpend(0); setLedger([]); setRedeemed([]); setReferralCode("");
      return;
    }
    apiCustomerGet<any>("loyalty/account")
      .then((a) => {
        setPoints(a.points ?? 0);
        setLifetimeSpend(a.lifetimeSpend ?? 0);
        setReferralCode(a.referralCode ?? makeReferralCode(email));
        setLedger(
          (a.ledger ?? []).map((l: any, i: number) => ({
            id: `srv-${i}`, type: mapLedgerType(l.type), points: l.points,
            label: l.label, ts: toTs(l.createdAt), orderNumber: l.orderNumber ?? undefined,
          }))
        );
        setRedeemed(
          (a.redemptions ?? []).map((r: any, i: number) => ({
            id: `red-${i}`, rewardId: "", ts: toTs(r.createdAt), pointsCost: r.cost, code: r.code, used: !!r.used,
          }))
        );
      })
      .catch(() => {});
  }, [email]);

  useEffect(() => { hydrate(); }, [hydrate]);

  const tier = getTier(lifetimeSpend);
  const next = nextTierFor(lifetimeSpend);
  const hasEarlyAccess = tier.id !== "bloom" || redeemed.some((r) => r.rewardId === "early");

  const redeem: Ctx["redeem"] = (rewardId) => {
    const reward = REWARD_CATALOG.find((r) => r.id === rewardId);
    if (!email || !reward || points < reward.cost) return null;
    const code = `CIRCLE-${rewardId.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    // Optimistic local update for instant UI feedback…
    setPoints((p) => p - reward.cost);
    setRedeemed((prev) => [
      { id: `red-${Date.now()}`, rewardId, ts: Date.now(), pointsCost: reward.cost, code, used: false },
      ...prev,
    ]);
    // …then persist server-side and re-sync the authoritative balance.
    apiCustomer("POST", "loyalty/redeem", { rewardKey: rewardId })
      .then(() => hydrate())
      .catch(() => hydrate());
    return code;
  };

  const setBirthday: Ctx["setBirthday"] = (date) => {
    setBirthdayState(date);
    apiCustomer("PUT", "auth/customer/preferences", { prefs: { birthday: date } }).catch(() => {});
  };

  // The following are retained for API compatibility; accrual now happens
  // server-side at checkout, so these are no-ops on the client.
  const earnForOrder: Ctx["earnForOrder"] = () => ({ pointsEarned: 0, tierUp: false, newTier: tier });
  const redeemAtCheckout: Ctx["redeemAtCheckout"] = () => {};
  const recordReview: Ctx["recordReview"] = () => {};
  const claimBirthday: Ctx["claimBirthday"] = () => 0;
  const applyReferral: Ctx["applyReferral"] = () => false;
  const addNewsletterBonus: Ctx["addNewsletterBonus"] = () => {};

  return (
    <LoyaltyCtx.Provider
      value={{
        signedIn: !!email,
        points,
        lifetimeSpend,
        tier,
        next,
        progressToNext: progressFor(lifetimeSpend),
        spendToNext: spendToNextTier(lifetimeSpend),
        ledger,
        referralCode: referralCode || (email ? makeReferralCode(email) : ""),
        redeemedRewards: redeemed,
        hasEarlyAccess,
        birthday,
        earnForOrder,
        redeemAtCheckout,
        redeem,
        recordReview,
        setBirthday,
        claimBirthday,
        applyReferral,
        addNewsletterBonus,
      }}
    >
      {children}
    </LoyaltyCtx.Provider>
  );
}

export { euroValueOfPoints, TIERS };
