import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppLayout from "./layout/AppLayout";
import PageLoader from "./components/common/PageLoader";
import { useAuthStore } from "./stores/authStore";

// Pages are code-split: each one's JS downloads only when its route is opened
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const KanbanPage = lazy(() => import("./pages/KanbanPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const MembersPage = lazy(() => import("./pages/MembersPage"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));

// Protected Route Guard: requires active session
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const LegacyInviteRedirect = () => {
  const { token } = useParams();
  return <Navigate to={`/invitations/accept?token=${encodeURIComponent(token)}`} replace />;
};

// Public Route Guard: prevents logged-in users from seeing login/signup
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

const App = () => {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Validate session on app initialization
    fetchMe();
  }, [fetchMe]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex"><PageLoader /></div>}>
      <Routes>
        {/* Protected App Routes with AppLayout Wrapper */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="board" element={<KanbanPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Public Authentication Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Invitation link: works signed in or out, so no route guard */}
        <Route path="/invitations/accept" element={<AcceptInvitation />} />
        {/* Old email link format (/<token>/accept) from invitations sent before the fix */}
        <Route path="/:token/accept" element={<LegacyInviteRedirect />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      {/* Global Hot Toaster Notification Provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#18181b",
            color: "#fafafa",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            fontSize: "13px",
            fontWeight: "500",
            borderRadius: "12px",
            padding: "10px 16px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#18181b",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#18181b",
            },
          },
        }}
      />
    </BrowserRouter>
  );
};

export default App;
