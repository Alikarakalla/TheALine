import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
} from "../components/AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import { api } from "../lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ pwd?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  useEffect(() => {
    setPageMeta({
      title: "Set a new password | The A Line",
      description: "Choose a new password for your The A Line account.",
      url: window.location.origin + "/reset-password",
    });
    return () => resetPageMeta();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (pwd.length < 8) errs.pwd = "Use at least 8 characters.";
    if (confirm !== pwd) errs.confirm = "Passwords don't match.";
    if (!token) errs.pwd = "This reset link is invalid or has expired.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api("auth/customer/reset-password", { method: "POST", body: { token, password: pwd } });
      setDone(true);
    } catch (err: any) {
      setErrors({ pwd: err?.message || "Could not reset your password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      quoteLead="Almost"
      quoteAccent="there"
      caption="Choose a strong new password and you're all set."
    >
      {done ? (
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
            lead="Password"
            accent="updated"
            sub="You can now sign in with your new password."
          />
          <AuthButton type="button">
            <span onClick={() => navigate("/login")}>Back to sign in</span>
          </AuthButton>
        </motion.div>
      ) : (
        <>
          <AuthHeading
            lead="New"
            accent="password"
            sub="Choose a new password for your account."
          />
          <form onSubmit={submit} noValidate>
            <Field
              label="New password"
              type="password"
              value={pwd}
              onChange={setPwd}
              error={errors.pwd}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <Field
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            <div style={{ marginTop: 8 }}>
              <AuthButton loading={loading}>
                {loading ? "Updating…" : "Update password"}
              </AuthButton>
            </div>
          </form>
          <div
            style={{
              textAlign: "center",
              marginTop: 26,
              fontSize: 14,
              color: "rgba(84,84,84,0.7)",
            }}
          >
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
        </>
      )}
    </AuthLayout>
  );
}
