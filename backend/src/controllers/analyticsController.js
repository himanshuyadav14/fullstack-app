const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Membership = require("../models/Membership");

/**
 * 1. GET /api/organizations/:orgId/analytics/dashboard
 * Organization-wide executive dashboard metrics (single-pass MongoDB aggregation)
 */
const getOrganizationDashboard = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const now = new Date();

    const [taskStats, totalProjects, totalTeams, totalMembers, recentTasks] =
      await Promise.all([
        Task.aggregate([
          { $match: { organization: orgId } },
          {
            $facet: {
              statusCounts: [
                { $group: { _id: "$status", count: { $sum: 1 } } },
              ],
              priorityCounts: [
                { $group: { _id: "$priority", count: { $sum: 1 } } },
              ],
              overdueCount: [
                {
                  $match: {
                    dueDate: { $ne: null, $lt: now },
                    status: { $nin: ["done", "cancelled"] },
                  },
                },
                { $count: "count" },
              ],
              unassignedCount: [
                {
                  $match: {
                    assignee: null,
                    status: { $nin: ["done", "cancelled"] },
                  },
                },
                { $count: "count" },
              ],
              summary: [
                {
                  $group: {
                    _id: null,
                    totalTasks: { $sum: 1 },
                    completedTasks: {
                      $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
                    },
                    estimatedHoursTotal: {
                      $sum: { $ifNull: ["$estimatedHours", 0] },
                    },
                  },
                },
              ],
            },
          },
        ]),
        Project.countDocuments({ organization: orgId }),
        Team.countDocuments({ organization: orgId }),
        Membership.countDocuments({ organization: orgId, status: "active" }),
        Task.find({ organization: orgId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("taskKey title status priority assignee updatedAt")
          .populate("assignee", "name email avatar")
          .lean(),
      ]);

    // Format facet results
    const facetData = taskStats[0] || {};
    const totalTasks = facetData.summary?.[0]?.totalTasks || 0;
    const completedTasks = facetData.summary?.[0]?.completedTasks || 0;
    const overdueTasks = facetData.overdueCount?.[0]?.count || 0;
    const unassignedTasks = facetData.unassignedCount?.[0]?.count || 0;
    const estimatedHoursTotal = facetData.summary?.[0]?.estimatedHoursTotal || 0;

    const completionRate =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 1000) / 10
        : 0;

    // Standardized status mapping (guaranteeing all statuses appear)
    const statusBreakdown = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      cancelled: 0,
    };
    (facetData.statusCounts || []).forEach((item) => {
      if (statusBreakdown[item._id] !== undefined) {
        statusBreakdown[item._id] = item.count;
      }
    });

    // Standardized priority mapping
    const priorityBreakdown = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    (facetData.priorityCounts || []).forEach((item) => {
      if (priorityBreakdown[item._id] !== undefined) {
        priorityBreakdown[item._id] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        organization: {
          id: req.organization._id,
          name: req.organization.name,
        },
        kpis: {
          totalProjects,
          totalTeams,
          totalMembers,
          totalTasks,
          completedTasks,
          overdueTasks,
          unassignedTasks,
          completionPercentage: completionRate,
          estimatedHoursTotal,
        },
        statusBreakdown,
        priorityBreakdown,
        recentActivity: recentTasks,
      },
    });
  } catch (error) {
    console.error("getOrganizationDashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 2. GET /api/organizations/:orgId/analytics/projects
 * Project-wise progress, task completion rates, and health metrics
 */
const getProjectAnalytics = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const now = new Date();

    const [allProjects, aggregatedStats] = await Promise.all([
      Project.find({ organization: orgId })
        .populate("team", "name")
        .select("_id name key status category team")
        .lean(),
      Task.aggregate([
        { $match: { organization: orgId } },
        {
          $group: {
            _id: "$project",
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$dueDate", null] },
                      { $lt: ["$dueDate", now] },
                      { $ne: ["$status", "done"] },
                      { $ne: ["$status", "cancelled"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    // Map aggregated stats by project ID
    const statsMap = new Map();
    aggregatedStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    const projectAnalytics = allProjects.map((proj) => {
      const stats = statsMap.get(proj._id.toString()) || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };

      const completionPercentage =
        stats.totalTasks > 0
          ? Math.round((stats.completedTasks / stats.totalTasks) * 1000) / 10
          : 0;

      return {
        projectId: proj._id,
        name: proj.name,
        key: proj.key,
        status: proj.status,
        category: proj.category,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        inProgressTasks: stats.inProgressTasks,
        overdueTasks: stats.overdueTasks,
        completionPercentage,
      };
    });

    return res.status(200).json({
      success: true,
      totalProjects: projectAnalytics.length,
      data: projectAnalytics,
    });
  } catch (error) {
    console.error("getProjectAnalytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 3. GET /api/organizations/:orgId/analytics/workload
 * Workload distribution across team members (active tasks, overdue, urgent load)
 */
const getWorkloadAnalytics = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const now = new Date();

    const workload = await Task.aggregate([
      {
        $match: {
          organization: orgId,
          assignee: { $ne: null },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: "$assignee",
          totalAssigned: { $sum: 1 },
          activeTasks: {
            $sum: { $cond: [{ $ne: ["$status", "done"] }, 1, 0] },
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$dueDate", null] },
                    { $lt: ["$dueDate", now] },
                    { $ne: ["$status", "done"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          urgentTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$priority", "urgent"] },
                    { $ne: ["$status", "done"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $lookup: {
          from: "memberships",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user", "$$userId"] },
                    { $eq: ["$organization", orgId] },
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "roles",
                localField: "role",
                foreignField: "_id",
                as: "roleData",
              },
            },
            { $unwind: { path: "$roleData", preserveNullAndEmptyArrays: true } },
          ],
          as: "membershipInfo",
        },
      },
      {
        $project: {
          _id: 1,
          user: {
            _id: "$_id",
            name: "$userInfo.name",
            email: "$userInfo.email",
            avatar: "$userInfo.avatar",
          },
          name: "$userInfo.name",
          email: "$userInfo.email",
          avatar: "$userInfo.avatar",
          role: {
            $ifNull: [
              { $arrayElemAt: ["$membershipInfo.roleData", 0] },
              { name: "Member" },
            ],
          },
          totalAssigned: 1,
          activeTasks: 1,
          pendingTasks: "$activeTasks",
          completedTasks: 1,
          overdueTasks: 1,
          urgentTasks: 1,
        },
      },
      { $sort: { activeTasks: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      totalMembersWithTasks: workload.length,
      data: workload,
    });
  } catch (error) {
    console.error("getWorkloadAnalytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 4. GET /api/organizations/:orgId/analytics/my-summary
 * Personal contributor dashboard metrics for the logged-in user
 */
const getMySummaryAnalytics = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const userId = req.user.id;
    const now = new Date();
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [userTaskStats, reportedCount] = await Promise.all([
      Task.aggregate([
        {
          $match: {
            organization: orgId,
            assignee: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $facet: {
            statusCounts: [
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            priorityCounts: [
              {
                $match: { status: { $nin: ["done", "cancelled"] } },
              },
              { $group: { _id: "$priority", count: { $sum: 1 } } },
            ],
            overdueTasks: [
              {
                $match: {
                  dueDate: { $ne: null, $lt: now },
                  status: { $nin: ["done", "cancelled"] },
                },
              },
              { $count: "count" },
            ],
            dueSoonTasks: [
              {
                $match: {
                  dueDate: { $ne: null, $gte: now, $lte: next7Days },
                  status: { $nin: ["done", "cancelled"] },
                },
              },
              { $count: "count" },
            ],
            summary: [
              {
                $group: {
                  _id: null,
                  totalAssigned: { $sum: 1 },
                  completedTasks: {
                    $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
                  },
                },
              },
            ],
          },
        },
      ]),
      Task.countDocuments({
        organization: orgId,
        reporter: userId,
      }),
    ]);

    const facet = userTaskStats[0] || {};
    const totalAssigned = facet.summary?.[0]?.totalAssigned || 0;
    const completedTasks = facet.summary?.[0]?.completedTasks || 0;
    const overdueCount = facet.overdueTasks?.[0]?.count || 0;
    const dueSoonCount = facet.dueSoonTasks?.[0]?.count || 0;
    const activeTasks = totalAssigned - completedTasks;

    const statusBreakdown = {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      cancelled: 0,
    };
    (facet.statusCounts || []).forEach((item) => {
      if (statusBreakdown[item._id] !== undefined) {
        statusBreakdown[item._id] = item.count;
      }
    });

    const activePriorityBreakdown = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    (facet.priorityCounts || []).forEach((item) => {
      if (activePriorityBreakdown[item._id] !== undefined) {
        activePriorityBreakdown[item._id] = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        userId,
        myOverview: {
          totalAssigned,
          activeTasks,
          completedTasks,
          overdueCount,
          dueSoonCount,
          reportedCount,
        },
        statusBreakdown,
        activePriorityBreakdown,
      },
    });
  } catch (error) {
    console.error("getMySummaryAnalytics Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getOrganizationDashboard,
  getProjectAnalytics,
  getWorkloadAnalytics,
  getMySummaryAnalytics,
};
