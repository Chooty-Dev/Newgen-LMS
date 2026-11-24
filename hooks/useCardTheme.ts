"use client";

import * as React from "react";
import { CARD_THEMES, CardTheme } from "@/lib/card-themes";

const STORAGE_KEY = "teacher_card_theme";
const EVENT_NAME = "card-theme-change";

export function useCardTheme() {
  const [themeId, setThemeId] = React.useState<string>("default");

  React.useEffect(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem(STORAGE_KEY) || "default";
    setThemeId(saved);
    applyThemeToDOM(saved);

    // Listen to theme changes from other components or tabs
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setThemeId(customEvent.detail);
        applyThemeToDOM(customEvent.detail);
      }
    };

    window.addEventListener(EVENT_NAME, handleThemeChange);
    return () => window.removeEventListener(EVENT_NAME, handleThemeChange);
  }, []);

  const setTheme = React.useCallback((newThemeId: string) => {
    setThemeId(newThemeId);
    try {
      localStorage.setItem(STORAGE_KEY, newThemeId);
    } catch {
      // ignore quota or security error in sandboxes
    }
    applyThemeToDOM(newThemeId);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: newThemeId }));
  }, []);

  const themeObj = CARD_THEMES.find((t) => t.id === themeId) || CARD_THEMES[0];
  const isDark = false;

  return {
    themeId,
    setTheme,
    themeObj,
    isDark,
  };
}

function applyThemeToDOM(themeId: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-card-theme", themeId);
  document.body.setAttribute("data-card-theme", themeId);
}
