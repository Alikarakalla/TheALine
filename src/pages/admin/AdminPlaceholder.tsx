import { TEXT_COLOR } from "../../lib/constants";

export default function AdminPlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 8 }}>MODULE</div>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR, marginBottom: 14 }}>{title}</h1>
      <div style={{ background: "#fff", border: "1px dashed rgba(84,84,84,0.25)", borderRadius: 16, padding: 40, color: "rgba(84,84,84,0.65)", fontSize: 14, lineHeight: 1.7, maxWidth: 560 }}>
        {note || `${title} management connects to the API and follows the same data-table + form pattern as Products. This module is part of the build queue.`}
      </div>
    </div>
  );
}
