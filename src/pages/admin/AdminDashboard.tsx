import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TEXT_COLOR, GLOW_COLOR } from "../../lib/constants";
import { apiGet } from "../../lib/api";
import { useAdminAuth } from "../../context/AdminAuth";

const EASE = [0.22, 1, 0.36, 1] as const;

function Stat({ label, value, i }: { label: string; value: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
      style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.1)", borderRadius: 16, padding: 22 }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1px", color: "rgba(84,84,84,0.5)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", color: TEXT_COLOR, marginTop: 8 }}>{value}</div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    apiGet<any[]>("admin/products", true).then(setProducts).catch(() => {});
  }, []);

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const soldOut = products.filter((p) => p.stock <= 0).length;

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "2.5px", color: "rgba(84,84,84,0.5)", marginBottom: 10 }}>DASHBOARD</div>
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1.5px", color: TEXT_COLOR, marginBottom: 6 }}>
        Welcome back, {admin?.name?.split(" ")[0]}
      </h1>
      <p style={{ fontSize: 14, color: "rgba(84,84,84,0.6)", marginBottom: 30 }}>Here's your store at a glance.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 30 }}>
        <Stat label="Products" value={String(products.length)} i={0} />
        <Stat label="Low stock" value={String(lowStock)} i={1} />
        <Stat label="Sold out" value={String(soldOut)} i={2} />
        <Stat label="Catalog value" value={"€" + products.reduce((s, p) => s + (p.price || 0) * (p.stock || 0), 0).toFixed(0)} i={3} />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/admin/products")} style={{ background: GLOW_COLOR, border: "none", borderRadius: 999, padding: "13px 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 600, color: "#111" }}>
          Manage products
        </button>
        <button onClick={() => navigate("/admin/settings")} style={{ background: "#fff", border: "1px solid rgba(84,84,84,0.2)", borderRadius: 999, padding: "13px 24px", cursor: "pointer", fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 500, color: TEXT_COLOR }}>
          Theme & settings
        </button>
      </div>
    </div>
  );
}
