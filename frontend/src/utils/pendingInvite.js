// localStorage key for an invitation link opened while signed out.
// Kept in its own module so AppLayout can use it without pulling in the
// (lazily loaded) AcceptInvitation page.
export const PENDING_INVITE_KEY = "pendingInviteToken";
