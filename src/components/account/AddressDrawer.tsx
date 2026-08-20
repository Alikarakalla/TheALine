import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Field, CheckBox } from "../AuthUI";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { useIsMobile } from "../../lib/useResponsive";
import type { Address } from "../../context/Addresses";
import { searchLebanon, reverseLebanon, type AddressSuggestion } from "../../lib/geocode";
import { Glyph, AddressGlyph } from "./icons";

const MapPicker = lazy(() => import("./MapPicker"));

const EASE = [0.22, 1, 0.36, 1] as const;
const HAIRLINE = "1px solid rgba(58,58,58,0.12)";
const BEIRUT = { lat: 33.8938, lng: 35.5018 };

const SearchGlyph = (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </>
);
const LocateGlyph = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    <circle cx="12" cy="12" r="7.5" />
  </>
);
const XGlyph = (
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>
);

const PRESETS = ["Home", "Work", "Other"] as const;

/** Address fields the drawer owns — name, phone and country come from the
 *  account itself (Lebanon-only delivery). */
export type AddressDraft = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  postcode: string;
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
};

export default function AddressDrawer({
  initial,
  onClose,
  onSave,
}: {
  initial?: Address;
  onClose: () => void;
  onSave: (d: AddressDraft) => void;
}) {
  const isMobile = useIsMobile();
  const presetOf = (l?: string) =>
    PRESETS.includes((l ?? "") as any) ? ((l ?? "Home") as (typeof PRESETS)[number]) : l ? "Other" : "Home";
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>(presetOf(initial?.label));
  const [customLabel, setCustomLabel] = useState(
    initial && presetOf(initial.label) === "Other" ? initial.label : ""
  );
  const [line1, setLine1] = useState(initial?.line1 ?? "");
  const [line2, setLine2] = useState(initial?.line2 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [makeDefault, setMakeDefault] = useState(!!initial?.isDefault);
  const [tried, setTried] = useState(false);

  // ---- address search (Photon, Lebanon-only) ----
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // ---- the pin: map + geolocation ----
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initial?.lat != null && initial?.lng != null ? { lat: initial.lat, lng: initial.lng } : null
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string>();
  // Reverse-geocode only pin moves made by the person (drag/tap/locate) —
  // not pins set from a picked suggestion, whose fields are already filled.
  const wantReverse = useRef(false);

  // Esc closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Debounced live suggestions while typing.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setSugs([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchLebanon(term, ctl.signal)
        .then((r) => {
          setSugs(r);
          setListOpen(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [q]);

  // Pin moved by the person → look the spot up and refill the fields.
  useEffect(() => {
    if (!pin || !wantReverse.current) return;
    wantReverse.current = false;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      reverseLebanon(pin.lat, pin.lng, ctl.signal)
        .then((r) => {
          if (!r.inLebanon) {
            setGeoMsg("That spot is outside Lebanon — move the pin back.");
            return;
          }
          if (r.line1) setLine1(r.line1);
          if (r.city) setCity(r.city);
          setPostcode(r.postcode || "");
          setGeoMsg("Filled from the pin — adjust anything that looks off.");
        })
        .catch(() => {});
    }, 450);
    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [pin]);

  const applySuggestion = (s: AddressSuggestion) => {
    if (s.line1) setLine1(s.line1);
    if (s.city) setCity(s.city);
    if (s.postcode) setPostcode(s.postcode);
    setQ("");
    setSugs([]);
    setListOpen(false);
    if (s.lat != null && s.lng != null) {
      wantReverse.current = false; // fields already filled from the suggestion
      setPin({ lat: s.lat, lng: s.lng });
      setMapOpen(true);
      setGeoMsg("Check the pin — drag it onto your building for exact delivery.");
    } else {
      setGeoMsg(undefined);
    }
  };

  const onPinMove = (lat: number, lng: number) => {
    wantReverse.current = true;
    setPin({ lat, lng });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoMsg("Location isn't available in this browser — search or use the map.");
      return;
    }
    setLocating(true);
    setGeoMsg(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        wantReverse.current = true;
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMapOpen(true);
        const acc = Math.round(pos.coords.accuracy || 0);
        setGeoMsg(
          acc > 800
            ? `Your device location is approximate (±${acc >= 1000 ? (acc / 1000).toFixed(1) + " km" : acc + " m"}) — drag the pin onto your building.`
            : "Located — drag the pin if it's not exactly on your building."
        );
      },
      () => {
        setLocating(false);
        wantReverse.current = false;
        setPin((p) => p ?? BEIRUT);
        setMapOpen(true);
        setGeoMsg("Location permission was declined — drop the pin on your building instead.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openMap = () => {
    if (!pin) {
      wantReverse.current = false;
      setPin(BEIRUT);
    }
    setMapOpen(true);
  };

  const label = preset === "Other" ? customLabel.trim() || "Other" : preset;
  const errLine1 = tried && !line1.trim() ? "Enter the street and building." : undefined;
  const errCity = tried && !city.trim() ? "Enter the city or town." : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!line1.trim() || !city.trim()) return;
    onSave({
      label,
      line1: line1.trim(),
      line2: line2.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
      isDefault: makeDefault,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(17,17,17,0.42)" }}
      />
      <motion.aside
        role="dialog"
        aria-label={initial ? "Edit address" : "Add address"}
        initial={{ x: "calc(100% + 20px)" }}
        animate={{ x: 0 }}
        exit={{ x: "calc(100% + 20px)" }}
        transition={{ duration: 0.45, ease: EASE }}
        style={{
          position: "fixed",
          top: 14,
          right: 14,
          bottom: 14,
          width: isMobile ? "calc(100vw - 28px)" : 440,
          zIndex: 401,
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(17,17,17,0.28)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Inter Tight', sans-serif",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px 14px",
          }}
        >
          <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.4px", color: TEXT_COLOR }}>
            {initial ? "Edit address" : "Add address"}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "none",
              border: HAIRLINE,
              cursor: "pointer",
              color: TEXT_COLOR,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Glyph size={14}>{XGlyph}</Glyph>
          </button>
        </div>

        {/* scrollable content */}
        <form
          onSubmit={submit}
          noValidate
          style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 24px 20px" }}>
            {/* find it fast */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "1.8px",
                textTransform: "uppercase",
                color: "rgba(58,58,58,0.62)",
                marginBottom: 8,
              }}
            >
              Find your address
            </div>
            <div style={{ position: "relative", zIndex: 6 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(58,58,58,0.55)",
                  display: "inline-flex",
                }}
              >
                <Glyph size={15}>{SearchGlyph}</Glyph>
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => sugs.length && setListOpen(true)}
                placeholder="Search street, area or landmark…"
                style={{
                  width: "100%",
                  background: "#fff",
                  border: "1.5px solid rgba(58,58,58,0.2)",
                  borderRadius: 12,
                  padding: "13px 15px 13px 41px",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 14.5,
                  color: TEXT_COLOR,
                  outline: "none",
                }}
              />
              {listOpen && (q.trim().length >= 3 || sugs.length > 0) && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    zIndex: 7,
                    background: "#fff",
                    border: HAIRLINE,
                    borderRadius: 12,
                    boxShadow: "0 16px 40px rgba(17,17,17,0.12)",
                    maxHeight: 230,
                    overflowY: "auto",
                    padding: 6,
                  }}
                >
                  {searching && (
                    <div style={{ padding: "10px 12px", fontSize: 13, color: "rgba(58,58,58,0.62)" }}>
                      Searching…
                    </div>
                  )}
                  {!searching && sugs.length === 0 && (
                    <div style={{ padding: "10px 12px", fontSize: 13, color: "rgba(58,58,58,0.62)" }}>
                      No matches in Lebanon — try a nearby street or landmark.
                    </div>
                  )}
                  {sugs.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderRadius: 8,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 13.5,
                        color: TEXT_COLOR,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ color: "rgba(58,58,58,0.5)", display: "inline-flex" }}>
                        <Glyph size={13}>{AddressGlyph}</Glyph>
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "none",
                  border: "1px solid rgba(58,58,58,0.22)",
                  borderRadius: 999,
                  padding: "11px 0",
                  cursor: locating ? "wait" : "pointer",
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: TEXT_COLOR,
                }}
              >
                <Glyph size={14}>{LocateGlyph}</Glyph>
                {locating ? "Locating…" : "Use my location"}
              </button>
              {!mapOpen && (
                <button
                  type="button"
                  onClick={openMap}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "none",
                    border: "1px solid rgba(58,58,58,0.22)",
                    borderRadius: 999,
                    padding: "11px 0",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: TEXT_COLOR,
                  }}
                >
                  <Glyph size={14}>{AddressGlyph}</Glyph>
                  Pin on map
                </button>
              )}
            </div>

            {mapOpen && pin && (
              <div style={{ marginTop: 12 }}>
                <Suspense
                  fallback={
                    <div
                      style={{
                        height: 250,
                        borderRadius: 12,
                        border: HAIRLINE,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        color: "rgba(58,58,58,0.62)",
                      }}
                    >
                      Loading map…
                    </div>
                  }
                >
                  <MapPicker lat={pin.lat} lng={pin.lng} onPick={onPinMove} />
                </Suspense>
                <div style={{ fontSize: 12, color: "rgba(58,58,58,0.62)", marginTop: 7 }}>
                  Drag the pin or tap your building — the address fills in automatically.
                </div>
              </div>
            )}
            {geoMsg && (
              <div style={{ fontSize: 12.5, color: "rgba(58,58,58,0.72)", marginTop: 8 }}>
                {geoMsg}
              </div>
            )}

            <div style={{ borderTop: HAIRLINE, margin: "20px 0 18px" }} />

            {/* label chips */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "1.8px",
                textTransform: "uppercase",
                color: "rgba(58,58,58,0.62)",
                marginBottom: 8,
              }}
            >
              Label
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: preset === "Other" ? 12 : 18 }}>
              {PRESETS.map((p) => {
                const on = preset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    aria-pressed={on}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 999,
                      background: on ? GLOW_COLOR : "transparent",
                      border: on ? "1.5px solid #111" : "1.5px solid rgba(58,58,58,0.2)",
                      cursor: "pointer",
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: 13.5,
                      fontWeight: on ? 600 : 450,
                      color: "#111",
                      transition: "background 0.2s ease, border 0.2s ease",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {preset === "Other" && (
              <Field
                label="Custom label"
                value={customLabel}
                onChange={setCustomLabel}
                placeholder="e.g. Parents' place"
              />
            )}

            <Field
              label="Street & building"
              value={line1}
              onChange={setLine1}
              error={errLine1}
              placeholder="Hamra Street, Saroulla Bldg"
            />
            <Field
              label="Apartment, floor (optional)"
              value={line2}
              onChange={setLine2}
              placeholder="3rd floor, Apt 5"
            />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1.4 }}>
                <Field label="City / town" value={city} onChange={setCity} error={errCity} placeholder="Beirut" />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Postcode (optional)" value={postcode} onChange={setPostcode} placeholder="1103" />
              </div>
            </div>

            {(!initial || !initial.isDefault) && (
              <CheckBox checked={makeDefault} onToggle={() => setMakeDefault((d) => !d)}>
                Use as my default delivery address
              </CheckBox>
            )}

            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12,
                color: "rgba(58,58,58,0.62)",
              }}
            >
              <Glyph size={12}>{AddressGlyph}</Glyph>
              {pin ? "Delivery pin saved with this address." : "Delivering across Lebanon."}
            </div>
          </div>

          {/* pinned footer */}
          <div style={{ display: "flex", gap: 12, padding: "16px 24px 20px", borderTop: HAIRLINE }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: "0 0 auto",
                background: "none",
                border: "1px solid rgba(58,58,58,0.25)",
                borderRadius: 999,
                padding: "0 24px",
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 14,
                color: TEXT_COLOR,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                background: GLOW_COLOR,
                color: "#111",
                border: "none",
                borderRadius: 999,
                padding: "15px 0",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              {initial ? "Save changes" : "Save address"}
            </button>
          </div>
        </form>
      </motion.aside>
    </>
  );
}
