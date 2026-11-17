import { useState, useEffect } from "react";
import { useOrgStore } from "../stores/orgStore";
import KpiCard from "../components/dashboard/KpiCard";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const DashboardPage = () => {
  const { currentOrg } = useOrgStore();

  const [dashboardData, setDashboardData] = useState(null);
  const [projectMetrics, setProjectMetrics] = useState([]);
  const [workloadMetrics, setWorkloadMetrics] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentOrg?._id) return;

    const loadAllMetrics = async () => {
      setLoading(true);
      try {
        const [dashRes, projRes, workRes, myRes] = await Promise.all([
          api.get(ENDPOINTS.ANALYTICS.DASHBOARD(currentOrg._id)),
          api.get(ENDPOINTS.ANALYTICS.PROJECTS(currentOrg._id)),
          api.get(ENDPOINTS.ANALYTICS.WORKLOAD(currentOrg._id)),
          api.get(ENDPOINTS.ANALYTICS.MY_SUMMARY(currentOrg._id)),
        ]);

        setDashboardData(dashRes.data.data);
        setProjectMetrics(projRes.data.data || []);
        setWorkloadMetrics(workRes.data.data || []);
        setMySummary(myRes.data.data?.myOverview || null);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllMetrics();
  }, [currentOrg?._id]);

  if (loading && !dashboardData) {
    return (
      <div className="py-20 text-center text-sm text-slate-500 dark:text-zinc-500">
        Loading workspace metrics...
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Executive Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          High-level overview of project health, workload, and task completion for{" "}
          <strong className="text-blue-600 dark:text-blue-400">
            {currentOrg?.name}
          </strong>
        </p>
      </div>

      {/* Personal Snapshot */}
      {mySummary && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Your Personal Snapshot
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                You have{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {mySummary.myPendingTasksCount} pending tasks
                </span>{" "}
                assigned to you in this organization.
              </div>
            </div>
          </div>
          {mySummary.myPendingTasksCount > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-200/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              Action Required
            </span>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Tasks"
          value={kpis.totalTasks || 0}
          colorClass="text-slate-900 dark:text-white"
        />
        <KpiCard
          title="Completed"
          value={kpis.completedTasks || 0}
          colorClass="text-green-600 dark:text-green-400"
          subtitle={`${kpis.completionRate || 0}% completion rate`}
        />
        <KpiCard
          title="Overdue Tasks"
          value={kpis.overdueTasks || 0}
          colorClass="text-red-600 dark:text-red-400"
          subtitle="Past due deadline"
        />
        <KpiCard
          title="Active Projects"
          value={kpis.totalProjects || 0}
          colorClass="text-blue-600 dark:text-blue-400"
          subtitle={`${kpis.totalMembers || 0} members collaborating`}
        />
      </div>

      {/* Project Health Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
        <h3 className="text-base font-bold tracking-tight mb-4">
          📁 Project Health & Progress
        </h3>
        {projectMetrics.length === 0 ? (
          <div className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
            No projects found. Create a project to view completion rates.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold uppercase text-slate-500 dark:text-zinc-400">
                  <th className="pb-3">Project</th>
                  <th className="pb-3">Key</th>
                  <th className="pb-3">Tasks</th>
                  <th className="pb-3">Done</th>
                  <th className="pb-3">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {projectMetrics.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-3 font-semibold text-slate-800 dark:text-zinc-200">
                      {p.name}
                    </td>
                    <td className="py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                      {p.key}
                    </td>
                    <td className="py-3">{p.totalTasks}</td>
                    <td className="py-3 text-green-600 dark:text-green-400 font-medium">
                      {p.completedTasks}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{ width: `${p.completionRate || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{p.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Workload Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
        <h3 className="text-base font-bold tracking-tight mb-4">
          👥 Team Member Workload
        </h3>
        {workloadMetrics.length === 0 ? (
          <div className="text-xs text-slate-400 dark:text-zinc-500 py-4 text-center">
            No member workload recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold uppercase text-slate-500 dark:text-zinc-400">
                  <th className="pb-3">Member</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Pending Tasks</th>
                  <th className="pb-3">Completed Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {workloadMetrics.map((w) => (
                  <tr key={w.user._id} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/40">
                    <td className="py-3 font-medium text-slate-800 dark:text-zinc-200">
                      {w.user.name}
                    </td>
                    <td className="py-3 text-xs capitalize text-slate-500 dark:text-zinc-400">
                      {w.role?.name || "Member"}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                        {w.pendingTasks}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400">
                        {w.completedTasks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
