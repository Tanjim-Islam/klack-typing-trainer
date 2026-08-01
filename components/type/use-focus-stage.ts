"use client";

import { useEffect } from "react";

/**
 * Marks the document while a typing session owns the screen. Global CSS uses
 * this to prevent page scrolling and hide the mobile bottom navigation while
 * leaving the top navigation available.
 */
export function useFocusStage(active: boolean) {
  useEffect(() => {
    const root = document.documentElement;
    if (active) root.dataset.testFocus = "true";
    else delete root.dataset.testFocus;

    return () => {
      delete root.dataset.testFocus;
    };
  }, [active]);
}
