/**
 * One-off cleanup of data left behind by the legacy global user/role design.
 *
 *   node scripts/cleanupLegacyData.js           # dry run: only reports counts
 *   node scripts/cleanupLegacyData.js --apply   # performs the cleanup
 *
 * Removes:
 *  - permissions that no longer exist (user:*, organization:delete) from every role
 *  - global roles that belong to no organization (pre multi-tenancy)
 *  - legacy user fields: role, verificationTokenHash, verificationTokenExpiresAt
 *
 * Uses the raw collections so fields that are no longer in the schemas can be matched and removed.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const REMOVED_PERMISSIONS = ["user:read", "user:create", "user:update", "user:delete", "organization:delete"];
const LEGACY_USER_FIELDS = ["role", "verificationTokenHash", "verificationTokenExpiresAt"];

const apply = process.argv.includes("--apply");

const run = async () => {
  if (!process.env.MONGO_URL) throw new Error("MONGO_URL is missing in .env");
  await mongoose.connect(process.env.MONGO_URL);
  const db = mongoose.connection.db;
  const roles = db.collection("roles");
  const users = db.collection("users");

  const rolesWithRemovedPerms = { permissions: { $in: REMOVED_PERMISSIONS } };
  const orphanRoles = { $or: [{ organization: { $exists: false } }, { organization: null }] };
  const usersWithLegacyFields = { $or: LEGACY_USER_FIELDS.map((f) => ({ [f]: { $exists: true } })) };

  const counts = {
    rolesWithRemovedPermissions: await roles.countDocuments(rolesWithRemovedPerms),
    globalRolesWithoutOrganization: await roles.countDocuments(orphanRoles),
    usersWithLegacyFields: await users.countDocuments(usersWithLegacyFields),
  };

  console.log(apply ? "Applying cleanup..." : "Dry run (no changes). Re-run with --apply to clean up.");
  console.table(counts);

  if (apply) {
    // Delete orphan global roles first so the $pull below only touches org roles
    const deleted = await roles.deleteMany(orphanRoles);
    const pulled = await roles.updateMany(rolesWithRemovedPerms, {
      $pull: { permissions: { $in: REMOVED_PERMISSIONS } },
    });
    const unset = await users.updateMany(usersWithLegacyFields, {
      $unset: Object.fromEntries(LEGACY_USER_FIELDS.map((f) => [f, ""])),
    });

    console.table({
      globalRolesDeleted: deleted.deletedCount,
      rolesCleaned: pulled.modifiedCount,
      usersCleaned: unset.modifiedCount,
    });
  }
};

run()
  .catch((err) => {
    console.error("Cleanup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
