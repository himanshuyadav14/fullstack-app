/**
 * Checkbox styled to match CustomSelect (zinc borders, monochrome fill, check icon).
 * Keeps a real <input type="checkbox"> for keyboard and screen-reader support.
 */
const Checkbox = ({ checked, onChange, disabled = false, indeterminate = false, className = "" }) => {
  const filled = checked || indeterminate;

  return (
    <span className={`relative inline-flex w-4 h-4 shrink-0 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-checked={indeterminate ? "mixed" : checked}
        className="peer absolute inset-0 w-full h-full opacity-0 m-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors
          peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-1 dark:peer-focus-visible:ring-offset-zinc-900
          ${
            filled
              ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900"
              : "bg-white border-zinc-300 dark:bg-zinc-900 dark:border-zinc-600 peer-hover:border-zinc-500 dark:peer-hover:border-zinc-400"
          }`}
      >
        {indeterminate && !checked ? (
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeWidth={4} d="M6 12h12" />
          </svg>
        ) : checked ? (
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </span>
    </span>
  );
};

export default Checkbox;
