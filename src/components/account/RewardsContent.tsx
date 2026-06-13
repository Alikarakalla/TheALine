import { motion } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import { useLoyalty } from "../../context/Loyalty";
import { useToast } from "../../context/Toast";
import { TIERS, REWARD_CATALOG, WAYS_TO_EARN, euroValueOfPoints } from "../../lib/loyalty";

const EASE = [0.22, 1, 0.36, 1] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.5px", color: TEXT_COLOR, marginBottom: 18 }}>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

export default function RewardsContent() {
  const isMobile = useIsMobile();
  const { show } = useToast();
  const { points, tier, ledger, referralCode, redeem, signedIn } = useLoyalty();

  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const copyReferral = () => {
    try {
      navigator.clipboard?.writeText(referralLink);
    } catch {
      /* ignore */
    }
    show({ title: "Referral link copied", description: "Give €3, get €1.50", tone: "reward" });
  };
  const onRedeem = (rewardId: string, label: string) => {
    const code = redeem(rewardId);
    if (code)
      show({
        title: `${label} unlocked`,
        description: `Code ${code} — applied at checkout`,
        tone: "reward",
        action: { label: "Go to bag", to: "/cart" },
      });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
      <Section title="Membership tiers">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
          {TIERS.map((t) => {
            const isCurrent = signedIn && t.id === tier.id;
            return (
              <div
                key={t.id}
                style={{
                  background: isCurrent ? "#161616" : "#fff",
                  color: isCurrent ? "#fff" : TEXT_COLOR,
                  border: isCurrent ? "none" : "1px solid rgba(84,84,84,0.12)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 24 }}>{t.name}</span>
                  {isCurrent && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "1px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "3px 9px" }}>YOU</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: isCurrent ? "rgba(255,255,255,0.55)" : "rgba(84,84,84,0.55)", marginTop: 4, marginBottom: 16 }}>
                  {t.min === 0 ? "From €0 spent" : `From €${t.min} lifetime`}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {t.perks.map((p) => (
                    <div key={p} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.4 }}>
                      <span style={{ color: GLOW_COLOR }}>✓</span>
                      <span style={{ color: isCurrent ? "rgba(255,255,255,0.8)" : "rgba(84,84,84,0.8)" }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Ways to earn">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {WAYS_TO_EARN.map((w) => (
            <div key={w.label} style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{w.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR }}>{w.label}</div>
              <div style={{ fontSize: 13, color: "#7e9400", marginTop: 2, fontWeight: 600 }}>{w.points}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Redeem your points">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {REWARD_CATALOG.map((r) => {
            const can = signedIn && points >= r.cost;
            const need = r.cost - points;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 14, padding: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_COLOR }}>{r.label}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.6)", marginTop: 2 }}>{r.description}</div>
                  <div style={{ fontSize: 12.5, color: TEXT_COLOR, marginTop: 6, fontWeight: 600 }}>{r.cost.toLocaleString()} pts</div>
                </div>
                <button
                  onClick={() => can && onRedeem(r.id, r.label)}
                  disabled={!can}
                  style={{
                    background: can ? GLOW_COLOR : "rgba(84,84,84,0.1)",
                    color: can ? "#111" : "rgba(84,84,84,0.5)",
                    border: "none", borderRadius: 999, padding: "11px 18px",
                    cursor: can ? "pointer" : "not-allowed",
                    fontFamily: "'Inter Tight', sans-serif", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
                  }}
                >
                  {can ? "Redeem" : signedIn ? `Need ${need}` : "Join to redeem"}
                </button>
              </div>
            );
          })}
        </div>
        {signedIn && points > 0 && (
          <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.6)", marginTop: 14 }}>
            Or apply points at checkout — 100 points = €1 off (up to half your order). You have{" "}
            <strong>€{euroValueOfPoints(points).toFixed(2)}</strong> to spend.
          </div>
        )}
      </Section>

      {signedIn && (
        <Section title="Refer a friend">
          <div style={{ background: "#161616", color: "#fff", borderRadius: 16, padding: 26, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 24, marginBottom: 6 }}>Give €3, get €1.50</div>
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.6)", maxWidth: 360 }}>
                Your friend gets 150 points to start; you get 300 when they place their first order.
              </div>
              <div style={{ marginTop: 14, fontSize: 13, color: GLOW_COLOR, fontFamily: "monospace" }}>{referralCode}</div>
            </div>
            <button onClick={copyReferral} style={{ background: GLOW_COLOR, color: "#111", border: "none", borderRadius: 999, padding: "13px 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600 }}>
              Copy invite link
            </button>
          </div>
        </Section>
      )}

      {signedIn && ledger.length > 0 && (
        <Section title="Points history">
          <div style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 14, overflow: "hidden" }}>
            {ledger.slice(0, 20).map((e, i) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: i === 0 ? "none" : "1px solid rgba(84,84,84,0.08)" }}>
                <div>
                  <div style={{ fontSize: 14, color: TEXT_COLOR }}>{e.label}</div>
                  <div style={{ fontSize: 11.5, color: "rgba(84,84,84,0.5)" }}>
                    {new Date(e.ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: e.points >= 0 ? "#6a8f00" : "#c0563f" }}>
                  {e.points >= 0 ? "+" : ""}{e.points}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
