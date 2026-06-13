import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiGet } from "../lib/api";

type ThemeSettings = Record<string, string | number | boolean>;
export type SiteSettings = {
  theme?: ThemeSettings;
  site?: Record<string, any>;
  seo?: Record<string, any>;
};

type Ctx = { settings: SiteSettings; loaded: boolean; reload: () => void };
const Ctx = createContext<Ctx | null>(null);
export function useSiteSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}

// Map theme keys -> CSS custom properties consumed by the design tokens.
const VAR_MAP: Record<string, string> = {
  primary_color: "--lb-primary",
  secondary_color: "--lb-secondary",
  text_color: "--lb-text",
  bg_cream: "--lb-cream",
  bg_paper: "--lb-paper",
  bg_dark: "--lb-dark",
};

export function applyTheme(theme?: ThemeSettings) {
  if (!theme) return;
  const root = document.documentElement;
  for (const [k, cssVar] of Object.entries(VAR_MAP)) {
    if (theme[k] != null) root.style.setProperty(cssVar, String(theme[k]));
  }
  if (theme.font_sans) root.style.setProperty("--lb-font-sans", `'${theme.font_sans}'`);
  if (theme.font_serif) root.style.setProperty("--lb-font-serif", `'${theme.font_serif}'`);
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    apiGet<SiteSettings>("settings")
      .then((s) => {
        setSettings(s || {});
        applyTheme(s?.theme);
      })
      .catch(() => {
        /* keep CSS fallbacks if the API is unreachable */
      })
      .finally(() => setLoaded(true));
  };

  useEffect(load, []);

  return (
    <Ctx.Provider value={{ settings, loaded, reload: load }}>{children}</Ctx.Provider>
  );
}
