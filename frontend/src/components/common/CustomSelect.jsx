import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Industry-Standard Minimalist Monochrome Dropdown Select
 * Features:
 * - Pure Black & White / Zinc palette
 * - SVG icons (no emojis)
 * - Click-outside detection
 * - Smooth transition & animated chevron
 * - Checkmark indicator on active item
 * - Optional avatar/icon support for Workspaces/Users
 * - Optional footer action (e.g., + Create Workspace)
 */
const CustomSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  helperText,
  size = "md", // "sm" | "md"
  className = "w-full",
  buttonClassName = "",
  menuClassName = "",
  disabled = false,
  headerTitle,
  footerAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Close on outside click (the menu lives in a portal, so check it separately)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const inTrigger = containerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // The menu is rendered in a portal with fixed positioning so parents with
  // overflow hidden/auto (cards, modals) can't clip it. Track the trigger's
  // position while open; open upwards when there isn't room below.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      const maxMenuHeight = 256 + 16;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < maxMenuHeight && rect.top > spaceBelow;
      const width = Math.max(rect.width, 200);
      // Keep it on screen horizontally
      const left = Math.min(rect.left, window.innerWidth - width - 8);

      setMenuStyle({
        position: "fixed",
        left: Math.max(8, left),
        width,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + gap }
          : { top: rect.bottom + gap }),
      });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true); // capture: any scrolling ancestor
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value
  );

  const selectedLabel =
    typeof selectedOption === "string"
      ? selectedOption
      : selectedOption?.label || value || placeholder;

  const isSmall = size === "sm";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ${
          isSmall ? "px-3 py-1.5 text-xs font-medium" : "px-3.5 py-2.5 text-sm"
        } ${
          isOpen
            ? "border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        } ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.avatar && (
            selectedOption.isAvatarUrl ? (
              <img
                src={selectedOption.avatar}
                alt=""
                className={`${
                  isSmall ? "w-4 h-4 rounded" : "w-5 h-5 rounded-md"
                } object-cover border border-zinc-200 dark:border-zinc-700 shrink-0`}
              />
            ) : (
              <div
                className={`${
                  isSmall ? "w-4 h-4 rounded text-[10px]" : "w-5 h-5 rounded-md text-xs"
                } bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold flex items-center justify-center uppercase text-zinc-900 dark:text-zinc-100 shrink-0`}
              >
                {selectedOption.avatar}
              </div>
            )
          )}
          <span
            className={`truncate ${
              !value && !selectedOption?.label ? "text-zinc-400 dark:text-zinc-500" : ""
            }`}
          >
            {selectedLabel}
          </span>
          {selectedOption?.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Minimal Chevron SVG */}
        <svg
          className={`${
            isSmall ? "w-3.5 h-3.5" : "w-4 h-4"
          } text-zinc-500 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {helperText && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
          {helperText}
        </p>
      )}

      {/* Dropdown Menu (portal: never clipped by overflow on ancestors) */}
      {isOpen && menuStyle && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className={`z-70 py-1.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 max-h-64 overflow-y-auto ${menuClassName}`}
        >
          {headerTitle && (
            <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {headerTitle}
            </div>
          )}

          {options.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const optVal = typeof option === "string" ? option : option.value;
              const optLabel = typeof option === "string" ? option : option.label;
              const isSelected = optVal === value;

              return (
                <button
                  key={optVal}
                  type="button"
                  onClick={() => {
                    onChange(optVal);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option?.avatar && (
                      option.isAvatarUrl ? (
                        <img
                          src={option.avatar}
                          alt=""
                          className="w-4 h-4 rounded object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-[10px] flex items-center justify-center uppercase text-zinc-900 dark:text-zinc-100 shrink-0">
                          {option.avatar}
                        </div>
                      )
                    )}
                    <span className="truncate">{optLabel}</span>
                    {option?.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                        {option.badge}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })
          )}

          {footerAction && (
            <>
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  footerAction.onClick();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>{footerAction.label}</span>
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};

export default CustomSelect;
