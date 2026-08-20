import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  SocialButtons,
  Divider,
  PasswordStrength,
  CheckBox,
  OtpInput,
  Glyph,
  TrustLine,
  SwitchLine,
  isEmail,
} from "../components/AuthUI";
import { PhoneField, EMPTY_PHONE, type PhoneValue } from "../components/PhoneField";
import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";
import { useAuth } from "../context/Auth";
import { setPageMeta, resetPageMeta } from "../lib/meta";
import { api } from "../lib/api";

type FieldName = "name" | "email" | "phone" | "pwd" | "confirm" | "terms";

const EASE = [0.22, 1, 0.36, 1] as const;
const MailGlyph = (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.5 7.5 8.5 6 8.5-6" />
  </>
);

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<PhoneValue>(EMPTY_PHONE);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitError, setSubmitError] = useState<string>();
  const [sending, setSending] = useState(false);

  // ---- verify step ----
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState<string>();
  const [verifying, setVerifying] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const lastTried = useRef("");

  useEffect(() => {
    setPageMeta({
      title: "Create account | The A Line",
      description: "Create your The A Line account.",
      url: window.location.origin + "/register",
    });
    return () => resetPageMeta();
  }, []);

  // 1s ticker for the expiry / resend countdowns while verifying.
  useEffect(() => {
    if (step !== "verify") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const touch = (f: FieldName) => setTouched((t) => ({ ...t, [f]: true }));

  // ---- live validation (errors derive from state; shown once touched) ----
  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email);
  const phoneOk = phone.empty || phone.valid;
  const pwdOk = pwd.length >= 8 && (score == null || score >= 2);
  const confirmOk = confirm === pwd && confirm.length > 0;

  const errName = touched.name && !nameOk ? "Please enter your name." : undefined;
  const errEmail = touched.email && !emailOk ? "Enter a valid email address." : undefined;
  const errPhone =
    !phone.empty && !phone.valid && (touched.phone || phone.complete)
      ? "Enter a valid phone number for the selected country."
      : undefined;
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
  const errTerms = touched.terms && !terms ? "Please accept the terms to continue." : undefined;

  const formOk = nameOk && emailOk && phoneOk && pwdOk && confirmOk && terms;

  // ---- step 1 → email the code ----
  const sendCode = async () => {
    setSending(true);
    setSubmitError(undefined);
    try {
      const res = await api<{ expiresIn: number; resendIn: number; devCode?: string }>(
        "auth/customer/register/send-code",
        { method: "POST", body: { name: name.trim(), email } }
      );
      const t = Date.now();
      setExpiresAt(t + (res.expiresIn ?? 600) * 1000);
      setResendAt(t + (res.resendIn ?? 60) * 1000);
      setDevCode(res.devCode ?? null);
      setCode("");
      setOtpError(undefined);
      lastTried.current = "";
      setStep("verify");
      setNow(Date.now());
      return true;
    } catch (err: any) {
      return err?.message || "Could not send the code. Please try again.";
    } finally {
      setSending(false);
    }
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, pwd: true, confirm: true, terms: true });
    if (!formOk) return;
    const r = await sendCode();
    if (r !== true) setSubmitError(r);
  };

  // ---- step 2 → verify the code, create the account ----
  const verify = async (c: string) => {
    if (verifying || c.length !== 6 || lastTried.current === c) return;
    lastTried.current = c;
    setVerifying(true);
    setOtpError(undefined);
    try {
      await signUp(name.trim(), email, pwd, phone.e164 ?? undefined, c);
      navigate("/account");
    } catch (err: any) {
      setOtpError(err?.message || "That code isn't right — check and try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify the moment the sixth digit lands.
  useEffect(() => {
    if (step === "verify" && code.length === 6) verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  const resend = async () => {
    const r = await sendCode();
    if (r !== true) setOtpError(r);
  };

  const expired = step === "verify" && now >= expiresAt;
  const resendWait = Math.max(0, resendAt - now);
  const canResend = !sending && (expired || resendWait === 0);

  return (
    <AuthLayout>
      {/* Step switch is instant with an entrance-only fade — never gated on
          an exit animation, so it works even with animations paused. */}
      {step === "verify" ? (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#141414",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                marginBottom: 22,
              }}
            >
              <Glyph size={22}>{MailGlyph}</Glyph>
            </div>
            <AuthHeading
              lead="Verify your"
              accent="email"
              sub={`We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`}
            />

            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                if (otpError) setOtpError(undefined);
              }}
              error={!!otpError}
              disabled={verifying || expired}
            />

            <div
              style={{
                minHeight: 22,
                marginTop: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              {otpError ? (
                <span role="alert" style={{ fontSize: 12.5, color: "#c0563f" }}>
                  {otpError}
                </span>
              ) : (
                <span style={{ fontSize: 12.5, color: "rgba(58,58,58,0.62)" }}>
                  {verifying
                    ? "Verifying…"
                    : expired
                    ? "This code has expired — send a new one."
                    : `Code expires in ${mmss(expiresAt - now)}`}
                </span>
              )}
            </div>

            {devCode && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(20,20,20,0.04)",
                  border: "1px dashed rgba(58,58,58,0.25)",
                  fontSize: 12.5,
                  color: "rgba(58,58,58,0.78)",
                }}
              >
                Local dev (no mail server) — your code is{" "}
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{devCode}</strong>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <AuthButton
                type="button"
                onClick={() => verify(code)}
                loading={verifying}
                disabled={code.length !== 6 || expired}
              >
                {verifying ? "Verifying…" : "Verify & create account"}
              </AuthButton>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                fontSize: 13.5,
                color: "rgba(58,58,58,0.72)",
              }}
            >
              <span>
                Didn't get it?{" "}
                <button
                  onClick={resend}
                  disabled={!canResend}
                  className="auth-link"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: canResend ? "pointer" : "default",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: canResend ? TEXT_COLOR : "rgba(58,58,58,0.45)",
                    textDecoration: canResend ? "underline" : "none",
                    textUnderlineOffset: 3,
                  }}
                >
                  {sending
                    ? "Sending…"
                    : canResend
                    ? "Resend code"
                    : `Resend in ${Math.ceil(resendWait / 1000)}s`}
                </button>
              </span>
              <button
                onClick={() => {
                  setStep("form");
                  setCode("");
                  setOtpError(undefined);
                }}
                className="auth-link"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13.5,
                  color: "rgba(58,58,58,0.72)",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  whiteSpace: "nowrap",
                }}
              >
                Change email
              </button>
            </div>

            <TrustLine>Codes are single-use and expire after 10 minutes.</TrustLine>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <AuthHeading
              lead="Create"
              accent="account"
              sub="Join The A Line and carry your story."
            />
            <form onSubmit={submitForm} noValidate>
              <Field
                label="Full name"
                name="name"
                value={name}
                onChange={setName}
                onBlur={() => touch("name")}
                error={errName}
                valid={nameOk}
                placeholder="Your name"
                autoComplete="name"
              />
              <Field
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={setEmail}
                onBlur={() => touch("email")}
                error={errEmail}
                valid={emailOk}
                placeholder="you@email.com"
                autoComplete="email"
              />
              <PhoneField
                label="Phone (optional)"
                defaultCountry="LB"
                error={errPhone}
                onPhone={setPhone}
                onBlur={() => touch("phone")}
              />
              <Field
                label="Password"
                type="password"
                name="new-password"
                value={pwd}
                onChange={setPwd}
                onBlur={() => touch("pwd")}
                error={errPwd}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <PasswordStrength password={pwd} userInputs={[name, email]} onScore={setScore} />
              <Field
                label="Confirm password"
                type="password"
                name="confirm-password"
                value={confirm}
                onChange={setConfirm}
                onBlur={() => touch("confirm")}
                error={errConfirm}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />

              <CheckBox
                checked={terms}
                onToggle={() => {
                  touch("terms");
                  setTerms((t) => !t);
                }}
              >
                I agree to the Terms of Service and Privacy Policy.
              </CheckBox>
              {errTerms && (
                <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginTop: 8 }}>
                  {errTerms}
                </div>
              )}
              {submitError && (
                <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginTop: 12 }}>
                  {submitError}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <AuthButton loading={sending}>
                  {sending ? "Sending code…" : "Continue"}
                </AuthButton>
              </div>
              <div
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "rgba(58,58,58,0.62)",
                }}
              >
                We'll email you a 6-digit code to verify your address.
              </div>
            </form>

            <Divider label="or continue with" />
            <SocialButtons />

            <SwitchLine
              prompt="Already have an account?"
              action="Sign in"
              onClick={() => navigate("/login")}
            />
            <TrustLine>Passwords are encrypted — we never store them in plain text.</TrustLine>
          </motion.div>
        )}
    </AuthLayout>
  );
}
