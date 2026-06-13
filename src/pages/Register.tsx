import { useEffect, useMemo, useState } from "react";
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

function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++;
  return s; // 0..3
}
const LABELS = ["Too short", "Weak", "Good", "Strong"];
const COLORS = ["#c0563f", "#d89a3f", "#9bb400", "#6a8f00"];

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    pwd?: string;
    terms?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: "Create account | The A Line",
      description: "Create your The A Line account.",
      url: window.location.origin + "/register",
    });
    return () => resetPageMeta();
  }, []);

  const str = useMemo(() => strength(pwd), [pwd]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2) errs.name = "Please enter your name.";
    if (!isEmail(email)) errs.email = "Enter a valid email address.";
    if (pwd.length < 8) errs.pwd = "Use at least 8 characters.";
    if (!terms) errs.terms = "Please accept the terms to continue.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await signUp(name.trim(), email, pwd);
      navigate("/account");
    } catch (err: any) {
      setErrors({ email: err?.message || "Could not create your account." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      quoteLead="Join the"
      quoteAccent="family"
      caption="Save your favourites, track orders and check out faster — it takes a minute."
    >
      <AuthHeading
        lead="Create"
        accent="account"
        sub="Join The A Line and carry your story."
      />
      <form onSubmit={submit} noValidate>
        <Field
          label="Full name"
          value={name}
          onChange={setName}
          error={errors.name}
          placeholder="Your name"
          autoComplete="name"
        />
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
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        {pwd.length > 0 && (
          <div style={{ margin: "-8px 0 18px" }}>
            <div style={{ display: "flex", gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    background:
                      i < str ? COLORS[str] : "rgba(84,84,84,0.15)",
                    transition: "background 0.3s ease",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: COLORS[str],
                marginTop: 6,
              }}
            >
              {LABELS[str]}
            </div>
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            cursor: "pointer",
            fontSize: 13,
            color: "rgba(84,84,84,0.75)",
            marginBottom: 6,
            lineHeight: 1.5,
          }}
        >
          <span
            onClick={() => setTerms((t) => !t)}
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              flexShrink: 0,
              marginTop: 1,
              border: terms ? "none" : "1.5px solid rgba(84,84,84,0.35)",
              background: terms ? GLOW_COLOR : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {terms && <span style={{ color: "#111", fontSize: 11 }}>✓</span>}
          </span>
          I agree to the Terms of Service and Privacy Policy.
        </label>
        {errors.terms && (
          <div style={{ fontSize: 12, color: "#c0563f", marginBottom: 14 }}>
            {errors.terms}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <AuthButton loading={loading}>
            {loading ? "Creating account…" : "Create account"}
          </AuthButton>
        </div>
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
        Already have an account?{" "}
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
          Sign in
        </button>
      </div>
    </AuthLayout>
  );
}
