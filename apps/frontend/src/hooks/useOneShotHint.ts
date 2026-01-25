import { useCallback, useEffect, useRef, useState } from "react";

// Onboarding hints: existing steps tooltip is in StepsRail; added waveform scrub + confusion nudge hints use this helper.
export function useOneShotHint(storageKey: string, autoHideMs = 4200) {
  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(storageKey) === "true";
  });
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const showOnce = useCallback(() => {
    if (seen) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "true");
    }
    setSeen(true);
    setVisible(true);
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
    }
    if (autoHideMs > 0) {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setVisible(false);
      }, autoHideMs);
    }
  }, [autoHideMs, seen, storageKey]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { visible, showOnce };
}
