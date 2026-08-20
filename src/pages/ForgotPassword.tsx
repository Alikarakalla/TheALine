import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  SuccessBadge,
  SwitchLine,
  TrustLine,
  isEmail,
} from "../components/AuthUI";
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

  return (
    <AuthLayout>
      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SuccessBadge />
          <AuthHeading
            lead="Check your"
            accent="inbox"
            sub={`If an account exists for ${email}, you'll receive a reset link shortly. The link expires in 30 minutes and works once.`}
          />
          <button
            onClick={() => setSent(false)}
            className="auth-link"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14,
              color: "rgba(58,58,58,0.72)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Use a different email
          </button>
          {resetToken && (
            <div style={{ marginTop: 20 }}>
              <AuthButton
                type="button"
                onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              >
                Continue to reset
              </AuthButton>
            </div>
          )}
          <SwitchLine
            prompt="Remembered it?"
            action="Back to sign in"
            onClick={() => navigate("/login")}
          />
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
              name="email"
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
          <SwitchLine
            prompt="Remembered it?"
            action="Back to sign in"
            onClick={() => navigate("/login")}
          />
          <TrustLine>Reset links are single-use and expire after 30 minutes.</TrustLine>
        </>
      )}
    </AuthLayout>
  );
}
