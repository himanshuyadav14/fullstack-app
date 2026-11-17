/**
 * Reusable Backdrop Modal Component (Tailwind CSS)
 */
const Modal = ({ title, children, onClose, maxWidth = "max-w-md" }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-zinc-100`}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 text-lg p-1 rounded-md transition-colors"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
