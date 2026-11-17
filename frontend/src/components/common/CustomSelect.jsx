import { useState, useRef, useEffect } from "react";

/**
 * Industry-Standard Minimalist Monochrome Dropdown Select
 * Features:
 * - Pure Black & White / Zinc palette
 * - SVG icons (no emojis)
 * - Click-outside detection
 * - Smooth transition
 * - Checkmark indicator on active item
 */
const CustomSelect = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find((opt) =>
    typeof opt === "string" ? opt === value : opt.value === value
  );

  const selectedLabel = typeof selectedOption === "string"
    ? selectedOption
    : selectedOption?.label || value || placeholder;

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors cursor-pointer bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 ${
          isOpen
            ? "border-zinc-900 dark:border-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
            : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        }`}
      >
        <span className={!value ? "text-zinc-400 dark:text-zinc-500" : ""}>
          {selectedLabel}
        </span>

        {/* Minimal Chevron SVG */}
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {options.map((option) => {
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
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <span>{optLabel}</span>
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-zinc-900 dark:text-zinc-100"
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
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;