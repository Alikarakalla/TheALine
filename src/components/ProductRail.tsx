import { motion } from "framer-motion";
import { asset } from "../lib/constants";
import { TEXT_COLOR } from "../lib/constants";
import { productImageFile, type Product } from "../lib/products";
import { useProductNav } from "../context/ProductNav";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ProductRail({
  title,
  products,
  light = true,
}: {
  title: string;
  products: Product[];
  light?: boolean;
}) {
  const { open } = useProductNav();
  if (products.length === 0) return null;
  const fg = light ? TEXT_COLOR : "#fff";

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "2px",
          color: light ? "rgba(84,84,84,0.5)" : "rgba(255,255,255,0.5)",
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {products.map((p, i) => {
          const img = p.images?.[0] ?? asset(productImageFile(p));
          return (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, ease: EASE, delay: i * 0.05 }}
              onClick={(e) => open(p, e.currentTarget.querySelector("img")!, img)}
              style={{
                flex: "0 0 auto",
                width: 150,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter Tight', sans-serif",
              }}
            >
              <div
                style={{
                  width: 150,
                  height: 175,
                  borderRadius: 12,
                  background: p.panel,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <img
                  src={img}
                  alt={p.name}
                  style={{
                    position: "absolute",
                    inset: "14%",
                    width: "72%",
                    height: "72%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <div style={{ marginTop: 10, fontSize: 14, fontWeight: 500, color: fg }}>{p.name}</div>
              <div style={{ fontSize: 13, color: light ? "rgba(84,84,84,0.6)" : "rgba(255,255,255,0.6)" }}>
                €{p.price.toFixed(2)}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
