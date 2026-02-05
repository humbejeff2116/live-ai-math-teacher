import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

export type StepActionKey = "explain" | "example" | "visual_hint";

export type StepActionsProps = {
  available: {
    explain: boolean;
    example: boolean;
    visualHint: boolean;
  };
  visualHintBusy?: boolean;
  visualHintLabel?: string;
  visualHintDisabled?: boolean;
  onExplain: () => void;
  onExample: () => void;
  onVisualHint: () => void;
  className?: string;
  collapseToMoreBelowPx?: number;
};

const ACTION_LABELS: Record<StepActionKey, string> = {
  explain: "Explain",
  example: "Example",
  visual_hint: "Hint",
};

const ACTION_ICONS: Record<StepActionKey, string> = {
  explain: "↻",
  example: "✎",
  visual_hint: "✨",
};

export function StepActions({
  available,
  visualHintBusy = false,
  visualHintLabel = "Visual hint",
  visualHintDisabled = false,
  onExplain,
  onExample,
  onVisualHint,
  className,
  collapseToMoreBelowPx = 320,
}: StepActionsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const availableKeys = useMemo<StepActionKey[]>(() => {
    const keys: StepActionKey[] = [];
    if (available.explain) keys.push("explain");
    if (available.example) keys.push("example");
    if (available.visualHint) keys.push("visual_hint");
    return keys;
  }, [available.example, available.explain, available.visualHint]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = (width: number) => {
      setCollapsed(width < collapseToMoreBelowPx);
    };

    update(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.width);
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [collapseToMoreBelowPx]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => {
      moreButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current?.contains(target)) return;
      closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, menuOpen]);

  const secondaryKey: StepActionKey | null = available.visualHint
    ? "visual_hint"
    : available.example
      ? "example"
      : null;

  const visibleKeys = useMemo<StepActionKey[]>(() => {
    if (!available.explain) return [];
    if (collapsed || !secondaryKey) return ["explain"];
    return ["explain", secondaryKey];
  }, [available.explain, collapsed, secondaryKey]);

  const menuKeys = availableKeys.filter((key) => !visibleKeys.includes(key));

  const handleActionClick = (
    event: MouseEvent<HTMLButtonElement>,
    action: StepActionKey,
  ) => {
    event.stopPropagation();
    if (action === "visual_hint") {
      if (visualHintDisabled || visualHintBusy) return;
      onVisualHint();
      return;
    }
    if (action === "explain") onExplain();
    if (action === "example") onExample();
  };

  const pillBase =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition";
  const pillPrimary = `${pillBase} bg-indigo-600 text-white hover:bg-indigo-700`;
  const pillSecondary = `${pillBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}
    >
      {visibleKeys.map((key) => {
        const isPrimary = key === "explain";
        const isHint = key === "visual_hint";
        const label = isHint ? visualHintLabel : ACTION_LABELS[key];
        const disabled = isHint ? visualHintDisabled || visualHintBusy : false;

        return (
          <button
            key={key}
            type="button"
            onClick={(event) => handleActionClick(event, key)}
            className={`${isPrimary ? pillPrimary : pillSecondary} ${
              disabled ? "opacity-60 cursor-not-allowed" : ""
            }`}
            disabled={disabled}
          >
            <span aria-hidden="true">{ACTION_ICONS[key]}</span>
            <span>{label}</span>
          </button>
        );
      })}

      {menuKeys.length > 0 && (
        <div className="relative">
          <button
            ref={moreButtonRef}
            type="button"
            className={`${pillSecondary} px-2`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
          >
            <span aria-hidden="true">⋯</span>
            <span>More</span>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-50"
            >
              {menuKeys.map((key) => {
                const isHint = key === "visual_hint";
                const label = isHint ? visualHintLabel : ACTION_LABELS[key];
                const disabled = isHint ? visualHintDisabled || visualHintBusy : false;
                return (
                  <button
                    key={key}
                    role="menuitem"
                    type="button"
                    disabled={disabled}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 ${
                      disabled ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    onClick={(event) => {
                      handleActionClick(event, key);
                      closeMenu();
                    }}
                  >
                    <span aria-hidden="true">{ACTION_ICONS[key]}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
