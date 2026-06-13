import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR } from "../lib/constants";
import { useIsMobile } from "../lib/useResponsive";
import { useToast, type Toast } from "../context/Toast";

const EASE = [0.22, 1, 0.36, 1] as const;

const accentFor = (tone: Toast["tone"]) =>
  tone === "error" ? "#c0563f" : tone === "default" ? "rgba(84,84,84,0.4)" : GLOW_COLOR;

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const duration = toast.duration ?? (toast.tone === "reward" ? 3800 : 3200);
  const accent = accentFor(toast.tone);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: isMobile ? 0 : 40, scale: 0.96, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE }}
      className="toast-card"
      style={{
        position: "relative",
        width: isMobile ? "100%" : 340,
        background: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 16px 40px rgba(17,17,17,0.16)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 14px 14px 16px",
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      {/* left accent */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accent,
        }}
      />

      {/* thumbnail / swatch / tone glyph */}
      {toast.image ? (
        <div
          style={{
            width: 42,
            height: 48,
            borderRadius: 8,
            background: "#ECE7DE",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <img
            src={toast.image}
            alt=""
            style={{
              position: "absolute",
              inset: "12%",
              width: "76%",
              height: "76%",
              objectFit: "contain",
            }}
          />
        </div>
      ) : toast.swatchHex ? (
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: toast.swatchHex,
            border: "1px solid rgba(84,84,84,0.2)",
            flexShrink: 0,
            marginTop: 1,
          }}
        />
      ) : (
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: toast.tone === "error" ? "rgba(192,86,63,0.12)" : GLOW_COLOR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {toast.tone === "error" ? "!" : toast.tone === "reward" ? "✦" : "✓"}
        </span>
      )}

      {/* body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_COLOR, lineHeight: 1.3 }}>
          {toast.title}
        </div>
        {toast.description && (
          <div style={{ fontSize: 12.5, color: "rgba(84,84,84,0.65)", marginTop: 2 }}>
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick?.();
              if (toast.action!.to) navigate(toast.action!.to);
              onDismiss(toast.id);
            }}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: TEXT_COLOR,
              textDecoration: "underline",
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* close */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(84,84,84,0.45)",
          fontSize: 15,
          lineHeight: 1,
          padding: 2,
          flexShrink: 0,
        }}
      >
        ✕
      </button>

      {/* auto-dismiss progress (CSS animation; pauses on hover; dismiss on end) */}
      {duration > 0 && (
        <span
          className="toast-progress"
          onAnimationEnd={() => onDismiss(toast.id)}
          style={
            {
              position: "absolute",
              left: 0,
              bottom: 0,
              height: 3,
              width: "100%",
              background: accent,
              opacity: 0.5,
              ["--toast-dur" as string]: `${duration}ms`,
            } as React.CSSProperties
          }
        />
      )}
    </motion.div>
  );
}

export default function ToastViewport() {
  const { toasts, dismiss } = useToast();
  const isMobile = useIsMobile();
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        zIndex: 9000,
        right: isMobile ? 12 : 24,
        left: isMobile ? 12 : "auto",
        bottom: isMobile ? 12 : 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        pointerEvents: "none",
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastCard toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
