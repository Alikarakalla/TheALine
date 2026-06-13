import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TEXT_COLOR } from "../lib/constants";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Accordion({
  title,
  body,
  children,
  defaultOpen = false,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: "1px solid rgba(84,84,84,0.18)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: "16px 0",
          cursor: "pointer",
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: TEXT_COLOR,
          textAlign: "left",
        }}
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          style={{ fontSize: 20, lineHeight: 1, color: TEXT_COLOR }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                paddingBottom: 18,
                fontSize: 13,
                lineHeight: 1.7,
                color: "rgba(84,84,84,0.75)",
              }}
            >
              {children ?? body}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
