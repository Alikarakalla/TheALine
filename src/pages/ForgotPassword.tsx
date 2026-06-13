import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  isEmail,
} from "../components/AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import { api } from "../lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({
      title: "Reset password | The A Line",
      description: "Reset your The A Line password.",
      url: window.location.origin + "/forgot-password",
    });
    return () => resetPageMeta();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const res = await api<{ resetToken?: string }>("auth/customer/forgot-password", {
        method: "POST",
        body: { email },
      });
      setResetToken(res?.resetToken || null);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <div
      style={{
        textAlign: "center",
        marginTop: 26,
        fontSize: 14,
        color: "rgba(84,84,84,0.7)",
      }}
    >
      Remembered it?{" "}
      <button
        onClick={() => navigate("/login")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: TEXT_COLOR,
          textDecoration: "underline",
        }}
      >
        Back to sign in
      </button>
    </div>
  );

  return (
    <AuthLayout
      quoteLead="It"
      quoteAccent="happens"
      caption="Reset your password in two steps and get back to the good stuff."
    >
      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: GLOW_COLOR,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              marginBottom: 22,
            }}
          >
            ✓
          </div>
          <AuthHeading
            lead="Check your"
            accent="inbox"
            sub={`If an account exists for ${email}, you'll receive a reset link shortly.`}
          />
          <button
            onClick={() => setSent(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              color: TEXT_COLOR,
              textDecoration: "underline",
            }}
          >
            Use a different email
          </button>
          {resetToken && (
            <button
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              style={{
                marginTop: 18,
                width: "100%",
                background: GLOW_COLOR,
                border: "none",
                borderRadius: 999,
                padding: "14px 20px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#111",
              }}
            >
              Continue to reset →
            </button>
          )}
          {backToLogin}
        </motion.div>
      ) : (
        <>
          <AuthHeading
            lead="Forgot"
            accent="password"
            sub="Enter your email and we'll send you a reset link."
          />
          <form onSubmit={submit} noValidate>
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              error={error}
              placeholder="you@email.com"
              autoComplete="email"
            />
            <div style={{ marginTop: 8 }}>
              <AuthButton loading={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </AuthButton>
            </div>
          </form>
          {backToLogin}
        </>
      )}
    </AuthLayout>
  );
}
