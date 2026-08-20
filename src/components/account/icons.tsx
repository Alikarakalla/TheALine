import type { ReactNode } from "react";

/** Drawn 1.6-stroke account-area icons — one weight, no emoji. */
export function Glyph({
  children,
  size = 15,
}: {
  children: ReactNode;
  size?: number;
}) {
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

export const OverviewGlyph = (
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>
);
export const OrdersGlyph = (
  <>
    <path d="M12 3 4 7v10l8 4 8-4V7l-8-4z" />
    <path d="M4 7l8 4 8-4" />
    <path d="M12 11v9" />
  </>
);
export const AddressGlyph = (
  <>
    <path d="M12 21s-6.5-5.3-6.5-10.2A6.5 6.5 0 0 1 12 4.2a6.5 6.5 0 0 1 6.5 6.6C18.5 15.7 12 21 12 21z" />
    <circle cx="12" cy="10.7" r="2.3" />
  </>
);
export const PaymentGlyph = (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
  </>
);
export const RewardsGlyph = (
  <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3z" />
);
export const WishlistGlyph = (
  <path d="M12 20s-7.3-4.6-9.3-8.7C1.2 8.2 3 5 6.2 5 8.4 5 10 6.4 12 8.3 14 6.4 15.6 5 17.8 5c3.2 0 5 3.2 3.5 6.3C18.3 15.4 12 20 12 20z" />
);
export const SettingsGlyph = (
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09c0-.69-.4-1.3-1-1.55a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09c.69 0 1.3-.4 1.55-1a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01c.6-.25 1-.86 1-1.51V3a2 2 0 1 1 4 0v.09c0 .65.4 1.26 1 1.51h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01c.25.6.86 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.65 0-1.26.4-1.51 1z" />
  </>
);
export const SignOutGlyph = (
  <>
    <path d="M9 21H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3H9" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>
);
export const ChevronRightGlyph = <path d="m9 6 6 6-6 6" />;
