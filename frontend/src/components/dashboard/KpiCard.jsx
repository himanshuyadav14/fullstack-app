/**
 * Reusable Metric KPI Card for Analytics Dashboard (Tailwind CSS)
 */
const KpiCard = ({ title, value, colorClass = "text-slate-900 dark:text-white", subtitle }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col gap-1.5 transition-colors">
      <div className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-zinc-400">
        {title}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${colorClass}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-slate-400 dark:text-zinc-500">{subtitle}</div>
      )}
    </div>
  );
};

export default KpiCard;
