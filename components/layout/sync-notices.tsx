"use client";

import { useEffect, useRef } from "react";
import { dismissSyncError, useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";

/**
 * Turns a failed database write into a toast. Renders nothing.
 *
 * Store actions are local-first and never block on the network, so without this
 * a failed sync would be invisible: the interface would show the change, the
 * account would not have it, and nobody would find out until they opened the app
 * somewhere else.
 */
export function SyncNotices() {
  const { syncError } = useStore();
  const toast = useToast();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!syncError) {
      // Armed again, so a repeat of the same failure still gets a toast.
      shown.current = null;
      return;
    }
    // Guards against React's double-invoked effects in development.
    if (shown.current === syncError) return;
    shown.current = syncError;

    toast({
      tone: "error",
      message: "Not saved to your account",
      detail: `${syncError} It is still saved in this browser.`,
    });

    // Cleared straight away so the next failure raises a fresh toast even if
    // the message is identical.
    dismissSyncError();
  }, [syncError, toast]);

  return null;
}
