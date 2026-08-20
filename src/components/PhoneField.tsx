import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";

/**
 * International phone input backed by libphonenumber-js (the JS port of
 * Google's libphonenumber) — validation and as-you-type formatting for every
 * country. The library loads lazily so its metadata never weighs down pages
 * that don't ask for a phone number. Defaults to Lebanon (+961).
 */

type PhoneLib = typeof import("libphonenumber-js/min");
type CountryCode = import("libphonenumber-js/min").CountryCode;

let libPromise: Promise<PhoneLib> | null = null;
const loadPhoneLib = () => (libPromise ??= import("libphonenumber-js/min"));

export type PhoneValue = {
  /** E.164 (+9613123456) when the number is valid, else null. */
  e164: string | null;
  valid: boolean;
  empty: boolean;
  /** True once the typed digits reach a full-length number for the country —
   *  the moment live "invalid" feedback stops being premature. */
  complete: boolean;
  /** What's literally in the field (formatted national number). */
  raw: string;
};

export const EMPTY_PHONE: PhoneValue = {
  e164: null,
  valid: false,
  empty: true,
  complete: false,
  raw: "",
};

const EASE = [0.22, 1, 0.36, 1] as const;
const ChevronDown = <path d="m6 9 6 6 6-6" />;
const CheckGlyph = <path d="M20 6.5 9.5 17 4 11.5" />;

function Glyph({ children, size = 12 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto", display: "block" }}
    >
      {children}
    </svg>
  );
}

export function PhoneField({
  label = "Phone",
  defaultCountry = "LB",
  initialValue,
  error,
  onPhone,
  onBlur,
}: {
  label?: string;
  defaultCountry?: string;
  /** Seed the field once (E.164 or national digits) — e.g. a stored phone.
   *  To swap the seed later, remount with a new `key`. */
  initialValue?: string;
  error?: string;
  onPhone: (v: PhoneValue) => void;
  onBlur?: () => void;
}) {
  const [lib, setLib] = useState<PhoneLib | null>(null);
  const [country, setCountry] = useState<CountryCode>(defaultCountry as CountryCode);
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    loadPhoneLib()
      .then((l) => alive && setLib(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);

  const countries = useMemo(() => {
    if (!lib) return [];
    return lib
      .getCountries()
      .map((c) => ({
        code: c,
        dial: lib.getCountryCallingCode(c),
        name: regionNames?.of(c) || c,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lib, regionNames]);

  const dial = lib ? lib.getCountryCallingCode(country) : "961";
  const countryName =
    countries.find((c) => c.code === country)?.name || regionNames?.of(country) || country;

  const [intl, setIntl] = useState("");
  const [valid, setValid] = useState(false);

  const evaluate = (t: string, c: CountryCode, l: PhoneLib | null) => {
    const empty = t.trim() === "";
    if (empty || !l) {
      setValid(false);
      setIntl("");
      onPhone({ e164: null, valid: false, empty, complete: false, raw: t });
      return;
    }
    const parsed = l.parsePhoneNumberFromString(t, c);
    const ok = !!parsed && parsed.isValid();
    // "complete" = the digits are no longer too short for this country, so an
    // invalid verdict is final rather than mid-typing noise.
    const complete = l.validatePhoneNumberLength(t, c) !== "TOO_SHORT";
    setValid(ok);
    setIntl(ok && parsed ? parsed.formatInternational() : "");
    onPhone({ e164: ok && parsed ? parsed.number : null, valid: ok, empty: false, complete, raw: t });
  };

  /** Reformat from raw digits so the country's grouping (03 123 456) is
   *  always visible in the field, and refuse digits past the country's
   *  maximum length instead of letting them pile up unformatted. */
  const render = (raw: string, c: CountryCode, l: PhoneLib | null) => {
    const digits = raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    if (!l || digits === "") return digits;
    return new l.AsYouType(c).input(digits);
  };

  // Seed once from initialValue as soon as the library is ready.
  const seeded = useRef(false);
  useEffect(() => {
    if (!lib || seeded.current) return;
    seeded.current = true;
    if (!initialValue) return;
    const parsed = lib.parsePhoneNumberFromString(initialValue, country);
    const c = ((parsed?.country as CountryCode) || country) as CountryCode;
    const nat = parsed
      ? new lib.AsYouType(c).input(parsed.nationalNumber)
      : render(initialValue, country, lib);
    if (parsed) setCountry(c);
    setText(nat);
    evaluate(nat, c, lib);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lib]);

  const handleInput = (v: string) => {
    const digits = v.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    const prevDigits = text.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    if (
      lib &&
      digits.length > prevDigits.length &&
      lib.validatePhoneNumberLength(digits, country) === "TOO_LONG"
    ) {
      return; // the country's numbers are never this long — swallow the digit
    }
    const out = render(v, country, lib);
    setText(out);
    evaluate(out, country, lib);
  };

  const selectCountry = (c: CountryCode) => {
    setCountry(c);
    setOpen(false);
    setQuery("");
    const out = render(text, c, lib);
    setText(out);
    evaluate(out, c, lib);
    inputRef.current?.focus();
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? countries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q.replace(/^\+/, ""))
      )
    : countries;

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: "rgba(58,58,58,0.62)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            background: "#fff",
            border: `1.5px solid ${
              error ? "#c0563f" : focus ? "#141414" : "rgba(58,58,58,0.2)"
            }`,
            boxShadow: focus && !error ? "0 0 0 3px rgba(20,20,20,0.07)" : "none",
            borderRadius: 12,
            transition: "border 0.2s ease, box-shadow 0.2s ease",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`Country: ${countryName} (+${dial})`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "none",
              borderRight: "1px solid rgba(58,58,58,0.14)",
              padding: "0 13px",
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14.5,
              fontWeight: 500,
              color: TEXT_COLOR,
              whiteSpace: "nowrap",
            }}
          >
            +{dial}
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              style={{ display: "inline-flex", opacity: 0.55 }}
            >
              <Glyph>{ChevronDown}</Glyph>
            </motion.span>
          </button>
          <input
            ref={inputRef}
            type="tel"
            inputMode="tel"
            name="phone"
            autoComplete="tel-national"
            value={text}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => {
              setFocus(false);
              onBlur?.();
            }}
            placeholder={country === "LB" ? "03 123 456" : "Phone number"}
            aria-invalid={!!error}
            spellCheck={false}
            style={{
              flex: 1,
              minWidth: 0,
              background: "none",
              border: "none",
              padding: valid ? "14px 40px 14px 16px" : "14px 16px",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 15,
              color: TEXT_COLOR,
              outline: "none",
            }}
          />
          {valid && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: 14,
                top: 19,
                color: "#5c7a00",
                display: "inline-flex",
              }}
            >
              <Glyph size={15}>{CheckGlyph}</Glyph>
            </span>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <>
              <div
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                style={{ position: "fixed", inset: 0, zIndex: 45 }}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.2, ease: EASE }}
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  zIndex: 46,
                  background: "#fff",
                  border: "1px solid rgba(58,58,58,0.12)",
                  borderRadius: 14,
                  boxShadow: "0 18px 40px rgba(17,17,17,0.1)",
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: 10, borderBottom: "1px solid rgba(58,58,58,0.1)" }}>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search country or code"
                    autoFocus
                    style={{
                      width: "100%",
                      background: "#fff",
                      border: "1px solid rgba(58,58,58,0.18)",
                      borderRadius: 9,
                      padding: "9px 12px",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13.5,
                      color: TEXT_COLOR,
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ maxHeight: 250, overflowY: "auto", padding: 6 }}>
                  {!lib && (
                    <div style={{ padding: "12px 10px", fontSize: 13, color: "rgba(58,58,58,0.62)" }}>
                      Loading countries…
                    </div>
                  )}
                  {filtered.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => selectCountry(c.code)}
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 14,
                        background: c.code === country ? "rgba(58,58,58,0.06)" : "none",
                        border: "none",
                        borderRadius: 8,
                        padding: "9px 10px",
                        cursor: "pointer",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 13.5,
                        fontWeight: c.code === country ? 600 : 400,
                        color: TEXT_COLOR,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.name}
                      </span>
                      <span
                        style={{
                          color: "rgba(58,58,58,0.62)",
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        +{c.dial}
                      </span>
                    </button>
                  ))}
                  {lib && filtered.length === 0 && (
                    <div style={{ padding: "12px 10px", fontSize: 13, color: "rgba(58,58,58,0.62)" }}>
                      No country matches "{query}".
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {error ? (
        <div role="alert" style={{ fontSize: 12.5, color: "#c0563f", marginTop: 6 }}>
          {error}
        </div>
      ) : valid && intl ? (
        <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)", marginTop: 6 }}>
          Saved as {intl}
        </div>
      ) : null}
    </div>
  );
}
