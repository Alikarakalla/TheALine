import { useState } from "react";
import { GLOW_COLOR, TEXT_COLOR } from "../lib/constants";

function Star({ fill, size }: { fill: number; size: number }) {
  // fill: 0..1 portion filled
  const id = `g${Math.round(fill * 100)}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#111" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.27l-5.91 3.11 1.13-6.57L2.45 9.16l6.6-.96L12 2.2z"
        fill={fill > 0 ? `url(#${id})` : "none"}
        strokeWidth="1"
        opacity={fill > 0 ? 1 : 0.4}
        style={{ stroke: TEXT_COLOR }}
      />
      {fill > 0 && (
        <path
          d="M12 2.2l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.27l-5.91 3.11 1.13-6.57L2.45 9.16l6.6-.96L12 2.2z"
          opacity={fill}
          style={{ mixBlendMode: "multiply", fill: GLOW_COLOR }}
        />
      )}
    </svg>
  );
}

export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - i))} />
      ))}
    </div>
  );
}

export function StarInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display: "inline-flex", gap: 4 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          aria-label={`${n} stars`}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <Star size={size} fill={n <= shown ? 1 : 0} />
        </button>
      ))}
    </div>
  );
}
