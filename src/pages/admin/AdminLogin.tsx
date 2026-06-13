import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SerifGlow from "../../components/SerifGlow";
import { Field, AuthButton } from "../../components/AuthUI";
import { GLOW_COLOR } from "../../lib/constants";
import { useAdminAuth } from "../../context/AdminAuth";
import { setPageMeta } from "../../lib/meta";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, admin } = useAdminAuth();
  const [email, setEmail] = useState("admin@lovebag.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMeta({ title: "Admin — The A Line", description: "The A Line admin." });
  }, []);
  useEffect(() => {
    if (admin) navigate("/admin", { replace: true });
  }, [admin, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#161616",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ width: "100%", maxWidth: 380 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "2.5px" }}>THE A LINE</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1px", color: "#111", background: GLOW_COLOR, borderRadius: 999, padding: "2px 8px" }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px" }}>Sign</span>
          <SerifGlow word="in" italic fontSize={44} lineHeight={42} letterSpacing={-1.5} strokeWidth={10} fillColor="#fff" delay={0.3} />
        </div>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", marginBottom: 26 }}>
          Manage your store, content and theme.
        </p>

        <form onSubmit={submit} noValidate>
          <div className="admin-dark-fields">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" error={error} />
          </div>
          <div style={{ marginTop: 8 }}>
            <AuthButton loading={loading}>{loading ? "Signing in…" : "Sign in"}</AuthButton>
          </div>
        </form>
        <div style={{ marginTop: 18, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          Demo: admin@lovebag.com / admin123
        </div>
      </motion.div>
    </div>
  );
}
