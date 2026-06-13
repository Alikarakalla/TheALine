// Derive a fulfillment status from an order's age (demo — no backend).

export type Stage = {
  key: string;
  label: string;
  afterHours: number;
};

export const STAGES: Stage[] = [
  { key: "placed", label: "Order placed", afterHours: 0 },
  { key: "crafting", label: "Crafting", afterHours: 6 },
  { key: "shipped", label: "Shipped", afterHours: 28 },
  { key: "out", label: "Out for delivery", afterHours: 60 },
  { key: "delivered", label: "Delivered", afterHours: 76 },
];

export function stageIndexFor(createdAt: number, now: number): number {
  const hours = (now - createdAt) / 36e5;
  let idx = 0;
  STAGES.forEach((s, i) => {
    if (hours >= s.afterHours) idx = i;
  });
  return idx;
}

export function statusLabel(createdAt: number, now: number): string {
  return STAGES[stageIndexFor(createdAt, now)].label;
}

/** Estimated delivery date = order date + 4 days. */
export function estimatedDelivery(createdAt: number): string {
  try {
    return new Date(createdAt + 4 * 864e5).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}
