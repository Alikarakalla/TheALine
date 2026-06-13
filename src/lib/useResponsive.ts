import { useState, useEffect } from "react";

const query = (q: string) =>
  typeof window !== "undefined" && window.matchMedia(q).matches;

/** True when the viewport is at or below `breakpoint` (default 768px). */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    query(`(max-width: ${breakpoint}px)`)
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

/** Tracks window.innerWidth, updating on resize. Returns a fallback during SSR. */
export function useViewportWidth(fallback = 1280) {
  const [w, setW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : fallback
  );
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}
