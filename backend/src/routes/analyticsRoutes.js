const express = require("express");
const {
  getOrganizationDashboard,
  getProjectAnalytics,
  getWorkloadAnalytics,
  getMySummaryAnalytics,
} = require("../controllers/analyticsController");
const { requireMembership } = require("../middleware/requireMembership");

const router = express.Router({ mergeParams: true });

// All analytics routes require verified membership in the target organization
router.use(requireMembership);

router.get("/dashboard", getOrganizationDashboard);
router.get("/projects", getProjectAnalytics);
router.get("/workload", getWorkloadAnalytics);
router.get("/my-summary", getMySummaryAnalytics);

module.exports = router;
