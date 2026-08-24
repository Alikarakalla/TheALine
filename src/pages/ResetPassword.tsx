import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  PasswordStrength,
  SuccessBadge,
  SwitchLine,
  TrustLine,
} from "../components/AuthUI";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import { api } from "../lib/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [touched, setTouched] = useState<{ pwd?: boolean; confirm?: boolean }>({});
  const [submitError, setSubmitError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  // Live validation — feedback per keystroke once a field is touched.
  const pwdOk = pwd.length >= 8 && (score == null || score >= 2);
  const confirmOk = confirm.length > 0 && confirm === pwd;
  const errPwd =
    touched.pwd && pwd.length > 0 && pwd.length < 8
      ? "Use at least 8 characters."
      : touched.pwd && pwd.length === 0
      ? "Choose a password."
      : pwd.length >= 8 && score != null && score < 2
      ? "That password is too easy to guess — make it longer or less common."
      : undefined;
  const errConfirm =
    confirm.length > 0 && confirm !== pwd && (touched.confirm || confirm.length >= pwd.length)
      ? "Passwords don't match."
      : touched.confirm && confirm.length === 0
      ? "Re-enter your password."
      : undefined;

  useEffect(() => {
    const __metaToken = setPageMeta({
      title: "Set a new password | The A Line",
      description: "Choose a new password for your The A Line account.",
      url: window.location.origin + "/reset-password",
    });
    return () => resetPageMeta(__metaToken);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ pwd: true, confirm: true });
    setSubmitError(undefined);
    if (!pwdOk || !confirmOk) return;
    if (!token) {
      setSubmitError("This reset link is invalid or has expired.");
      return;
    }
    setLoading(true);
    try {
      await api("auth/customer/reset-password", { method: "POST", body: { token, password: pwd } });
      setDone(true);
    } catch (err: any) {
      setSubmitError(err?.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {done ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SuccessBadge />
          <AuthHeading
            lead="Password"
            accent="updated"
            sub="You can now sign in with your new password."
          />
          <AuthButton type="button" onClick={() => navigate("/login")}>
            Back to sign in
          </AuthButton>
        </motion.div>
      ) : (
        <>
          <AuthHeading
            lead="New"
            accent="password"
            sub="Choose a strong new password for your account."
          />
          <form onSubmit={submit} noValidate>
            <Field
              label="New password"
              type="password"
              name="new-password"
              value={pwd}
              onChange={setPwd}
              onBlur={() => setTouched((t) => ({ ...t, pwd: true }))}
              error={errPwd}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <PasswordStrength password={pwd} onScore={setScore} />
            <Field
              label="Confirm password"
              type="password"
              name="confirm-password"
              value={confirm}
              onChange={setConfirm}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              error={errConfirm}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
            {submitError && (
              <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginBottom: 12 }}>
                {submitError}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <AuthButton loading={loading}>
                {loading ? "Updating…" : "Update password"}
              </AuthButton>
            </div>
          </form>
          <SwitchLine
            prompt="Changed your mind?"
            action="Back to sign in"
            onClick={() => navigate("/login")}
          />
          <TrustLine>This reset link works once, then it's gone for good.</TrustLine>
        </>
      )}
    </AuthLayout>
  );
}
