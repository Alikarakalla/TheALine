import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AuthLayout,
  AuthHeading,
  Field,
  AuthButton,
  SocialButtons,
  Divider,
  isEmail,
} from "../components/AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useAuth } from "../context/Auth";
import { setPageMeta, resetPageMeta } from "../lib/meta";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; pwd?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: "Sign in | The A Line",
      description: "Sign in to your The A Line account.",
      url: window.location.origin + "/login",
    });
    return () => resetPageMeta();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isEmail(email)) errs.email = "Enter a valid email address.";
    if (pwd.length < 1) errs.pwd = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await signIn(email, pwd);
      navigate("/account");
    } catch (err: any) {
      setErrors({ pwd: err?.message || "Invalid email or password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      quoteLead="Welcome"
      quoteAccent="back"
      caption="Your bag, your saved pieces and your order history — right where you left them."
    >
      <AuthHeading
        lead="Welcome"
        accent="back"
        sub="Sign in to your The A Line account."
      />
      <form onSubmit={submit} noValidate>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="you@email.com"
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={pwd}
          onChange={setPwd}
          error={errors.pwd}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "6px 0 22px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              color: "rgba(84,84,84,0.75)",
            }}
          >
            <span
              onClick={() => setRemember((r) => !r)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: remember ? "none" : "1.5px solid rgba(84,84,84,0.35)",
                background: remember ? GLOW_COLOR : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {remember && <span style={{ color: "#111", fontSize: 11 }}>✓</span>}
            </span>
            Remember me
          </label>
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              color: TEXT_COLOR,
              textDecoration: "underline",
            }}
          >
            Forgot password?
          </button>
        </div>

        <AuthButton loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </AuthButton>
      </form>

      <Divider label="or" />
      <SocialButtons />

      <div
        style={{
          textAlign: "center",
          marginTop: 26,
          fontSize: 14,
          color: "rgba(84,84,84,0.7)",
        }}
      >
        New to The A Line?{" "}
        <button
          onClick={() => navigate("/register")}
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
          Create an account
        </button>
      </div>
    </AuthLayout>
  );
}
