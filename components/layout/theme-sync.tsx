"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Mirrors the saved theme settings onto <html>. The very first paint is handled
 * by the blocking script in the root layout; this keeps things in sync
 * afterwards, including when the OS switches appearance mid-session.
 */
export function ThemeSync() {
  const { settings, ready } = useStore();
  const { theme, accent, motion } = settings;

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;

    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };

    apply();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.accent = accent;
  }, [accent, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.motion = motion === "reduced" ? "reduced" : "system";
  }, [motion, ready]);

  return null;
}

/**
 * Runs before first paint to avoid a flash of the wrong theme. Kept tiny and
 * defensive: any failure just falls through to the light default.
 */
export const themeBootstrapScript = `
(function(){
  try {
    var raw = localStorage.getItem("klack.v1");
    var s = raw ? (JSON.parse(raw).settings || {}) : {};
    var theme = s.theme || "system";
    var dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    document.documentElement.dataset.accent = s.accent || "teal";
    document.documentElement.dataset.motion = s.motion === "reduced" ? "reduced" : "system";
  } catch (e) {}
})();
`;
