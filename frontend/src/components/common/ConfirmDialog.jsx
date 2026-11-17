import { useEffect, useRef } from "react";
import { useConfirmStore } from "../../stores/confirmStore";

/**
 * App-wide confirmation dialog. Open it with `await confirm({...})`
 * from stores/confirmStore. Sits above regular modals.
 */
const ConfirmDialog = () => {
  const { request, close } = useConfirmStore();
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!request) return;
    // Focus Cancel by default so a stray Enter never confirms a destructive action
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [request]);

  if (!request) return null;

  const isDanger = request.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isDanger
                    ? "M12 9v3.75m0 3.75h.008M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    : "M12 16v-4m0-4h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z"
                }
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 id="confirm-title" className="text-base font-semibold tracking-tight">
              {request.title}
            </h3>
            {request.message && (
              <p id="confirm-message" className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                {request.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => close(false)}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500"
                : "bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white focus-visible:ring-zinc-500"
            }`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
