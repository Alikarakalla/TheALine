import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  SocialButtons,
  Divider,
  TrustLine,
  SwitchLine,
  isEmail,
} from "../components/AuthUI";
import { TEXT_COLOR } from "../lib/constants";
import { useAuth } from "../context/Auth";
import { setPageMeta, resetPageMeta } from "../lib/meta";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [touched, setTouched] = useState<{ email?: boolean; pwd?: boolean }>({});
  const [submitError, setSubmitError] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Live validation: shown once a field is touched, re-evaluated per keystroke.
  const emailOk = isEmail(email);
  const errEmail = touched.email && !emailOk ? "Enter a valid email address." : undefined;
  const errPwd = touched.pwd && pwd.length === 0 ? "Enter your password." : undefined;

  useEffect(() => {
    const __metaToken = setPageMeta({
      title: "Sign in | The A Line",
      description: "Sign in to your The A Line account.",
      url: window.location.origin + "/login",
    });
    return () => resetPageMeta(__metaToken);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, pwd: true });
    setSubmitError(undefined);
    if (!emailOk || pwd.length === 0) return;
    setLoading(true);
    try {
      await signIn(email, pwd);
      navigate("/account");
    } catch (err: any) {
      setSubmitError(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading
        lead="Welcome"
        accent="back"
        sub="Sign in to your The A Line account."
      />
      <form onSubmit={submit} noValidate>
        <Field
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={errEmail}
          valid={emailOk}
          placeholder="you@email.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          name="password"
          value={pwd}
          onChange={setPwd}
          onBlur={() => setTouched((t) => ({ ...t, pwd: true }))}
          error={errPwd}
          placeholder="Your password"
          autoComplete="current-password"
        />
        {submitError && (
          <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginBottom: 12 }}>
            {submitError}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", margin: "2px 0 22px" }}>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="auth-link"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              color: TEXT_COLOR,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Forgot password?
          </button>
        </div>

        <AuthButton loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </AuthButton>
      </form>

      <Divider label="or continue with" />
      <SocialButtons />

      <SwitchLine
        prompt="New to The A Line?"
        action="Create an account"
        onClick={() => navigate("/register")}
      />
      <TrustLine>Encrypted sign-in — your details stay private.</TrustLine>
    </AuthLayout>
  );
}
